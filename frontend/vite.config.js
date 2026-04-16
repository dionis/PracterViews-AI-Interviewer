import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})


// export default defineConfig({
//   plugins: [react()],
//   server: {
//     allowedHosts: [
//       '5173-01kp6s0cad2q9m0h5kyt9v9xrg.cloudspaces.litng.ai',           // Host específico
//       '.ngrok-free.app',        // Permite el dominio y todos sus subdominios
  
//     ]
//   }
// })
