<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
    <i class="pi pi-spin pi-spinner text-2xl" />
    <p>Signing you in…</p>
  </div>
</template>

<script>
import { useAuthStore } from '@/stores/auth'

export default {
  async mounted() {
    const code = new URLSearchParams(window.location.search).get('code');
    console.log("got code")
    console.log(code)
    if (!code) {
      console.error('No code found in URL');
      return;
    }

    try {
      const code_verifier = sessionStorage.getItem("pkce_code_verifier");
      const provider = new URLSearchParams(window.location.search).get('provider');
      const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: new Headers({
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }),
		body: JSON.stringify({ code, code_verifier, provider })
	});
      const auth = useAuthStore()
      auth.checkLoginStatus();
      this.$router.push('/boards');
    } catch (error) {
      console.error('Login failed', error);
    }
  }
}
</script>

