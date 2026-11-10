
# SANETTY BAZY

Tienda de demostración con seis modelos, tallas EU, bolsa persistente en el navegador y el cupón de ejemplo `LUNA15` (15%). Los productos, imágenes, precios y marca son de muestra.

## Vista previa

Con Node.js 24, abre una terminal en esta carpeta y ejecuta `node build.mjs` y luego `node preview.mjs`. Visita la dirección que imprime el servidor. La vista previa guarda solicitudes en el archivo local `bonos.sqlite`. También puedes abrir `public/index.html` directamente para probar catálogo, video, bolsa y cupón.

## Captura y envío del bono

La versión alojada guarda un registro por correo en D1, mediante la vinculación `DB`. Para activar los envíos de Resend, configura `RESEND_API_KEY` como secreto de Sites y `BONUS_FROM` con un remitente de un dominio verificado. El formulario solicita consentimiento para enviar el bono y confirma el envío cuando el proveedor acepta el mensaje.

Para exportar solicitudes, configura el secreto `BONUS_EXPORT_TOKEN`. Haz una solicitud GET a `/api/bonos/exportar` con la cabecera `Authorization: Bearer <token>`. La descarga JSON incluye el correo y las fechas de solicitud y envío.

El catálogo se edita en `public/shop.js`. Las fotos y el video de 16,8 segundos se guardan en `public/assets`. La bolsa calcula un total de demostración y no cobra pagos.
