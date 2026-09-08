module.exports = {
  root: true,
  extends: ['@nuxt/eslint-config'],
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/html-self-closing': 'off',
    // Règle Vue 2 : Vue 3 autorise plusieurs racines de template (fragments).
    'vue/no-multiple-template-root': 'off'
  }
}
