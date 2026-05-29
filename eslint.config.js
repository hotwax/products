import accxuiConfig from "../accxui/eslint.config.js"

export default [
  ...accxuiConfig,
  {
    rules: {
      "import/order": "off",
      "import/no-unresolved": "off",
      "no-undef": "off"
    }
  }
]
