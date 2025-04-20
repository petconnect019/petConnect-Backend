# Configuración de ngrok para el Backend de PetConnect

## Configuración recomendada

Para configurar correctamente ngrok con el backend de PetConnect y las notificaciones de ePayco, sigue estos pasos:

1. **Inicia ngrok con el comando**:
   ```
   ngrok http 5000
   ```

2. **Copia la URL generada de ngrok** (ejemplo: `https://abc123.ngrok-free.app`)

3. **Actualiza el archivo `.env` en la raíz del proyecto backend con las nuevas URLs**:
   ```
   NGROK_DOMAIN=abc123.ngrok-free.app
   NGROK_BACKEND_URL=https://abc123.ngrok-free.app
   NGROK_FRONTEND_URL=https://abc123.ngrok-free.app
   ```

4. **Actualiza la URL en el panel de ePayco**:
   - URL de Respuesta: `https://abc123.ngrok-free.app/payment-success`
   - URL de Confirmación: `https://abc123.ngrok-free.app/api/payments/epayco/confirmation`

5. **Reinicia el servidor backend**:
   ```
   npm run dev
   ```

## Notas importantes

- Cada vez que reinicies ngrok, obtendrás una nueva URL. Debes actualizar todas las referencias a la URL anterior.
- Asegúrate de que tanto el frontend como el backend estén expuestos a través de ngrok si ambos necesitan ser accesibles desde Internet.
- El servidor mostrará la URL de ngrok al iniciar si está correctamente configurada.
- Si estás usando tanto el backend como el frontend con ngrok, puedes usar el mismo túnel para ambos apuntando a puertos diferentes, o crear túneles separados.

## Solución para errores comunes

1. **Error 403 Forbidden**:
   - Verifica que la URL de ngrok esté actualizada en `.env`
   - Asegúrate de que el servidor se haya reiniciado después de actualizar las variables de entorno

2. **Error CORS**:
   - El servidor está configurado para aceptar automáticamente peticiones desde la URL de ngrok
   - Si persisten problemas de CORS, verifica que la URL exacta de ngrok esté correctamente configurada

3. **Notificaciones de ePayco no llegan**:
   - Verifica que la URL de confirmación en ePayco coincida exactamente con la URL de ngrok actual
   - Asegúrate de que el método de confirmación sea POST
   - Revisa los logs del servidor para ver si hay intentos de conexión 