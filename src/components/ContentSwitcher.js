import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Rx from 'rxjs/Rx';

import delay from '../helpers/delay';

const UI_THRESHOLDS = {
   mouse: 150,
   touch: 150,
   wheel: 200
};

const WHEEL_TIMEOUT = 100;

export default class ContentSwitcher extends Component {
   constructor(props) {
      super(props);

      this.state = {
         top: 0,
         left: 0,
         animationStyle: {}
      };

      this._syncState = {
         top: 0,
         left: 0
      };

      this.switch = this.switch.bind(this);
      this._onSubscriptionNext = this._onSubscriptionNext.bind(this);
      this._setTransitionEndListenerOnce = this._setTransitionEndListenerOnce.bind(this);
      this._putContentBack = this._putContentBack.bind(this);
      this._putContentLeave = this._putContentLeave.bind(this);
   }

   componentDidMount() {
      const rootDom = this.refs.root;

      const {
         fixed,
         switchDisabled
      } = this.props;

      this._subscription = Rx.Observable.merge(
         Rx.Observable.fromEvent(rootDom, 'mousedown')
            .map(evt => ({
               type: 'mouse',
               x: evt.clientX,
               y: evt.clientY
            })),
         Rx.Observable.fromEvent(rootDom, 'touchstart')
            .map(evt => ({
               type: 'touch',
               x: evt.touches[0].clientX,
               y: evt.touches[0].clientY
            })),
         Rx.Observable.fromEvent(rootDom, 'wheel')
            .map(evt => ({
               type: 'wheel',
               x: -evt.deltaX,
               y: -evt.deltaY
            }))
      )
         .filter(() => !this._origin)
         .do(origin => this._origin = origin)
         .mergeMap(origin => {
            switch(origin.type) {
            case 'mouse':
               return Rx.Observable.merge(
                  Rx.Observable.fromEvent(rootDom, 'mousemove')
                     .map(evt => ({
                        top: fixed.vertical ? 0 : (evt.clientY - this._origin.y),
                        left: fixed.horizonal ? 0 : evt.clientX - this._origin.x
                     })),
                  Rx.Observable.merge(
                     Rx.Observable.fromEvent(rootDom, 'mouseup'),
                     Rx.Observable.fromEvent(rootDom, 'mouseleave')
                  )
                     .take(1)
                     .concatMap(() => Rx.Observable.of('complete', 'end'))
               )
                  .takeWhile(next => next !== 'end');
            case 'touch':
               return Rx.Observable.merge(
                  Rx.Observable.fromEvent(rootDom, 'touchmove')
                     .map(evt => ({
                        top: fixed.vertical ? 0 : evt.touches[0].clientY - this._origin.y,
                        left: fixed.horizonal ? 0 : evt.touches[0].clientX - this._origin.x
                     })),
                  Rx.Observable.merge(
                     Rx.Observable.fromEvent(rootDom, 'touchend'),
                     Rx.Observable.fromEvent(rootDom, 'touchcancel')
                  )
                     .take(1)
                     .concatMap(() => Rx.Observable.of('complete', 'end'))
               )
                  .takeWhile(next => next !== 'end');
            case 'wheel':
               return Rx.Observable.fromEvent(rootDom, 'wheel')
                  .scan((pre, curr) => ({
                     top: fixed.vertical ? 0 : pre.top - curr.deltaY,
                     left: fixed.horizonal ? 0 : pre.left - curr.deltaX
                  }), {
                     top: fixed.vertical ? 0 : this._origin.y,
                     left: fixed.horizonal ? 0 : this._origin.x
                  })
                  .switchMap(next => Rx.Observable.merge(
                     Rx.Observable.of(next),
                     Rx.Observable.merge(
                        Rx.Observable.timer(WHEEL_TIMEOUT).mapTo(true),
                        Rx.Observable.of(
                           (-next.top >= UI_THRESHOLDS.wheel && !switchDisabled.top) ||
                           (next.top >= UI_THRESHOLDS.wheel && !switchDisabled.bottom) ||
                           (-next.left >= UI_THRESHOLDS.wheel && !switchDisabled.left) ||
                           (next.left >= UI_THRESHOLDS.wheel && !switchDisabled.right)
                        )
                     )
                        .filter(evt => evt)
                        .take(1)
                        .concatMap(evt => Rx.Observable.of('complete', 'end'))
                  ))
                  .takeWhile(next => next !== 'end');
            }
         })
         .subscribe(this._onSubscriptionNext);
   }

   componentWillUnmount() {
      this._subscription.unsubscribe();
   }

   async switch(direction, withCallbacks = true) {
      const {
         height,
         width,
         onContentLeave,
         onContentEnter
      } = this.props;

      let stateAfterLeave = {};

      if( !this._origin )
         this._origin = {};

      switch( direction ) {
      case 'top':
         stateAfterLeave = {
            top: height,
            left: 0
         };
         break;
      case 'bottom':
         stateAfterLeave = {
            top: -height,
            left: 0
         };
         break;
      case 'left':
         stateAfterLeave = {
            top: 0,
            left: width
         };
         break;
      case 'right':
         stateAfterLeave = {
            top: 0,
            left: -width
         };
         break;
      default:
         direction = null;
      }

      stateAfterLeave.animationStyle = {};

      if( direction ) {
         if( withCallbacks )
            onContentLeave(direction);

         await this._putContentLeave(direction);

         this.setState(stateAfterLeave);
         this._syncState = stateAfterLeave;
         await delay(0);

         if( withCallbacks )
            onContentEnter(direction);

         await this._putContentBack('enter');
      } else {
         await this._putContentBack('cancel');
      }

      this.setState({
         animationStyle: {},
         top: 0,
         left: 0
      });
      this._syncState = {
         top: 0,
         left: 0
      };

      delete this._origin;
   }

   async _onSubscriptionNext(next) {
      if( next === 'complete' ) {
         const uiThreshold = UI_THRESHOLDS[this._origin.type];

         const {
            switchDisabled,
         } = this.props;

         let direction = '';

         if(-this._syncState.top >= uiThreshold && !switchDisabled.top) {
            direction = 'top';
         } else if(this._syncState.top >= uiThreshold && !switchDisabled.bottom) {
            direction = 'bottom';
         } else if(-this._syncState.left >= uiThreshold && !switchDisabled.left) {
            direction = 'left';
         } else if(this._syncState.left >= uiThreshold && !switchDisabled.right) {
            direction = 'right';
         }

         await this.switch(direction, true);
      } else {
         this._syncState = {
            top: next.top,
            left: next.left
         };
         this.setState({
            top: next.top,
            left: next.left
         });
      }
   }

   _setTransitionEndListenerOnce(callback) {
      const rootDom = this.refs.root;
      const transitionEndCallback = () => {
         rootDom.removeEventListener('transitionend', transitionEndCallback);
         rootDom.removeEventListener('webkitTransitionEnd', transitionEndCallback);
         rootDom.removeEventListener('msTransitionEnd', transitionEndCallback);
         rootDom.removeEventListener('oTransitionEnd', transitionEndCallback);
         callback();
      };

      rootDom.addEventListener('transitionend', transitionEndCallback);
      rootDom.addEventListener('webkitTransitionEnd', transitionEndCallback);
      rootDom.addEventListener('msTransitionEnd', transitionEndCallback);
      rootDom.addEventListener('oTransitionEnd', transitionEndCallback);
   }

   _putContentBack(type) {
      return new Promise(resolve => {
         const {
            top,
            left
         } = this._syncState;

         const {
            styleGenerator,
            transitionTypeCancel,
            transitionDurationCancel,
            transitionTypeEnter,
            transitionDurationEnter
         } = this.props;

         if( top === 0 && left === 0 )
            return resolve();

         this._setTransitionEndListenerOnce(resolve);

         let transitionType, transitionDuration;
         if( type === 'cancel' ) {
            transitionType = transitionTypeCancel;
            transitionDuration = transitionDurationCancel;
         } else {
            transitionType = transitionTypeEnter;
            transitionDuration = transitionDurationEnter;
         }

         this.setState({
            animationStyle: {
               ...styleGenerator(0),
               ...{
                  top: 0,
                  left: 0,
                  transition: `all ${transitionDuration}ms ${transitionType}`
               }
            }
         });
      });
   }

   _putContentLeave(direction) {
      return new Promise(resolve => {
         const {
            top,
            left
         } = this._syncState;

         const {
            styleGenerator,
            transitionTypeLeave,
            transitionDurationLeave,
            height,
            width
         } = this.props;

         let positionStyle;
         switch( direction ) {
         case 'top':
            positionStyle = {
               top: top - height,
               left: 0
            };
            break;
         case 'right':
            positionStyle = {
               top: 0,
               left: left + width
            };
            break;
         case 'bottom':
            positionStyle = {
               top: top + height,
               left: 0
            };
            break;
         case 'left':
            positionStyle = {
               top: 0,
               left: left - width
            };
            break;
         }

         this._setTransitionEndListenerOnce(resolve);

         this.setState({
            animationStyle: {
               ...styleGenerator(1),
               ...positionStyle,
               ...{
                  transition: `all ${transitionDurationLeave}ms ${transitionTypeLeave}`
               }
            }
         });
      });
   }

   render() {
      const {
         style,
         width,
         height,
         children,
         threshold,
         styleGenerator
      } = this.props;

      const {
         top,
         left,
         animationStyle
      } = this.state;

      let ratio = Math.max(Math.abs(top), Math.abs(left)) / threshold;
      ratio = ratio > 1 ? 1 : ratio;

      const rootStyle = {...style, ...{
         width,
         height,
         position: 'relative',
         overflow: 'hidden'
      }};

      const contentStyle = {
         ...{
            width,
            height
         },
         ...styleGenerator(ratio),
         ...{
            top,
            left,
            position: 'relative'
         },
         ...animationStyle
      };

      return (
         <div
            ref='root'
            style={ rootStyle }
         >
            <div style={ contentStyle }>
               { children }
            </div>
         </div>
      );
   }
}

ContentSwitcher.propTypes = {
   children: PropTypes.node.isRequired,
   width: PropTypes.number.isRequired,
   height: PropTypes.number.isRequired,
   threshold: PropTypes.number.isRequired,

   transitionTypeCancel: PropTypes.string,
   transitionTypeLeave: PropTypes.string,
   transitionTypeEnter: PropTypes.string,

   transitionDurationCancel: PropTypes.number,
   transitionDurationLeave: PropTypes.number,
   transitionDurationEnter: PropTypes.number,

   fixed: PropTypes.objectOf(PropTypes.bool),
   switchDisabled: PropTypes.objectOf(PropTypes.bool),

   styleGenerator: PropTypes.func,
   style: PropTypes.object,

   onContentLeave: PropTypes.func,
   onContentEnter: PropTypes.func
};

ContentSwitcher.defaultProps = {
   transitionTypeCancel: 'ease',
   transitionTypeLeave: 'ease-out',
   transitionTypeEnter: 'ease-out',

   transitionDurationCancel: 500,
   transitionDurationLeave: 500,
   transitionDurationEnter: 500,

   fixed: {
      horizonal: false,
      vertical: false
   },
   switchDisabled: {
      top: false,
      right: false,
      bottom: false,
      left: false
   },

   horizonal: true,
   vertical: true,

   styleGenerator: () => ({}),
   style: {},

   onContentLeave: () => null,
   onContentEnter: () => null
};
