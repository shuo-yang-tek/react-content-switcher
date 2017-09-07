import React, { Component } from 'react';
import ContentSwitcher from './components/ContentSwitcher';

class App extends Component {
   constructor(props) {
      super(props);

      this._colors = [
         '#faa',
         '#afa',
         '#aaf'
      ];

      this.state = {
         count: 0
      };

      this._styleGenerator = this._styleGenerator.bind(this);
      this._onContentLeave = this._onContentLeave.bind(this);
      this._onContentEnter = this._onContentEnter.bind(this);
   }

   componentDidMount() {
      setTimeout(() => {
         this.refs.cs.switch('left');
      }, 1000);
   }

   _styleGenerator(ratio) {
      return {
         opacity: 1 - ratio,
      };
   }

   _onContentLeave(direction) {
      console.log(`leave: ${direction}`);
   }

   _onContentEnter(direction) {
      console.log(`enter: ${direction}`);
      this.setState({
         count: this.state.count + 1
      });
   }

   render() {
      return (
         <ContentSwitcher
            ref='cs'
            width={ 800 }
            height={ 800 }
            threshold={ 400 }
            styleGenerator={ this._styleGenerator }
            onContentLeave={ this._onContentLeave }
            onContentEnter={ this._onContentEnter }
            switchDisabled={{
               top: true,
               bottom: true,
               left: true,
               right: true
            }}
            style={{
               border: '1px solid'
            }}
         >
            <div style={{
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               width: '100%',
               height: '100%'
            }}>
               <div style={{
                  width: '50%',
                  height: '50%',
                  backgroundColor: this._colors[this.state.count % this._colors.length]
               }} />
            </div>
         </ContentSwitcher>
      );
   }
}

const styles = {
   root: {
      width: '100%',
      height: window.innerHeight,
      display: 'flex',
      //alignItems: 'center',
      //justifyContent: 'center'
   },
   outer: {
      width: 600,
      height: 600,
      backgroundColor: '#faa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
   },
   inner: {
      width: 300,
      height: 300,
      backgroundColor: '#afa'
   }
};

export default App;
