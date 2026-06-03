import accxuiConfig from "../accxui/eslint.config.js"

export default [
  ...accxuiConfig,
  {
    rules: {
      "import/order": "off",
      "import/no-unresolved": "off",
      "no-undef": "off",
      // editor cards receive a shared reactive draft object from useCardDraft and edit its
      // properties in place (top-level prop reassignment is still an error)
      "vue/no-mutating-props": ["error", { "shallowOnly": true }]
    }
  }
]
