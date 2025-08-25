<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from '@/stores/auth'
import InputGroup from 'primevue/inputgroup';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Password from 'primevue/password';
import base64 from 'base-64';

import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast';


const toast = useToast();
const router = useRouter()

const store = useTaskStore()
const authStore = useAuthStore()

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push('/tasks')
  }
})

function base64url(buffer) {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generatePKCE() {
  const codeVerifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const code_verifier = base64url(codeVerifierBytes);

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
  const code_challenge = base64url(new Uint8Array(digest));

  return { code_verifier, code_challenge };
}

async function loginWithGithub() {
  const { code_verifier, code_challenge } = await generatePKCE();

  // Store the code_verifier temporarily
  sessionStorage.setItem("pkce_code_verifier", code_verifier);

  const clientId = 'Ov23liqqiVqq1lqxD5AV';
  const redirectUri = 'https://spring.morfic.de/oauth2/callback?provider=github';
  const scope = 'user';
  const responseType = 'code';

  const authUrl =
    `https://github.com/login/oauth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=${responseType}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `code_challenge=${code_challenge}&` +
    `code_challenge_method=S256`;

  window.location.href = authUrl;
}

async function loginWithDiscord() {
  const { code_verifier, code_challenge } = await generatePKCE();

  // Store the code_verifier temporarily
  sessionStorage.setItem("pkce_code_verifier", code_verifier);

  const clientId = '1390322077785133067';
  const redirectUri = 'https://spring.morfic.de/oauth2/callback?provider=discord';
  const scope = 'identify email';
  const responseType = 'code';

  const authUrl =
    `https://discord.com/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=${responseType}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `prompt=consent&` +
    `code_challenge=${code_challenge}&` +
    `code_challenge_method=S256`;

  window.location.href = authUrl;
}

async function loginWithGoogle() {
  const { code_verifier, code_challenge } = await generatePKCE();

  // Store the code_verifier temporarily
  sessionStorage.setItem("pkce_code_verifier", code_verifier);

  const clientId = '462857227500-spe4l3v5mgjb63u0kbb9tpr87n09tkbq.apps.googleusercontent.com';
  const redirectUri = 'https://spring.morfic.de/oauth2/callback?provider=google';
  const scope = 'openid email profile';
  const responseType = 'code';

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=${responseType}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `code_challenge=${code_challenge}&` +
    `code_challenge_method=S256`;

  window.location.href = authUrl;
}
</script>

<template>
  <div class="login">
  <Button
  @click="loginWithGoogle"
  class="m-3"
  icon="pi pi-google"
  label="Login with Google"
  severity="warn"
  outlined
  />
<Button
  @click="loginWithGithub"
  icon="pi pi-github"
  label="Login with Github"
  severity="warn"
  outlined
/>
  <Button
  @click="loginWithDiscord"
  icon="pi pi-discord"
  label="Login with Discord"
  severity="warn"
  outlined
/>

  </div>

</template>
<style>
.login {
    margin: auto;
    display: grid;
    grid-gap: .5rem;
}
</style>

