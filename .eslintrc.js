module.exports = {
   "env": {
      "browser": true,
      "commonjs": true,
      "es6": true
   },
   "extends": "eslint:recommended",
   "parserOptions": {
      "ecmaFeatures": {
         "experimentalObjectRestSpread": true,
         "jsx": true
      },
      "ecmaVersion": 2017,
      "sourceType": "module"
   },
   "plugins": [
      "react"
   ],
   "rules": {
      "indent": [
         "error",
         3
      ],
      "linebreak-style": [
         "error",
         "unix"
      ],
      "quotes": [
         "error",
         "single"
      ],
      "semi": [
         "error",
         "always"
      ],
      "no-empty": [
         "error", 
         {
            "allowEmptyCatch": true
         }
      ],
      "no-unused-vars": [
         "off"
      ],
      "no-console": [
         "off"
      ],
      "no-constant-condition": [
         "off"
      ],
      "no-irregular-whitespace": [
         "error", {
            "skipRegExps": true
         }
      ],
      "no-case-declarations": [
         "off"
      ]
   }
};
