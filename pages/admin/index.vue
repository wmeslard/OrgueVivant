<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
await navigateTo('/admin/concerts', { replace: true })
</script>
<template></template>
