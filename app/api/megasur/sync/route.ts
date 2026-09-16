import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(request: Request) {
  const authToken = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.MEGASUR_SYNC_TOKEN}`;

  if (!process.env.MEGASUR_SYNC_TOKEN || authToken !== expectedToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  console.log('Disparador de sincronización manual recibido. Iniciando en segundo plano...');

  try {
    // Ejecuta el script de sincronización como un proceso separado y no espera a que termine.
    // Esto evita que la petición de la API se quede esperando y dé timeout.
    const syncProcess = spawn('npm', ['run', 'megasur:sync'], {
      detached: true,
      stdio: 'ignore', // Ignoramos la salida para que no se quede en memoria
      cwd: process.cwd(), // Asegura que se ejecuta en el directorio correcto
    });

    // Libera el proceso padre para que pueda terminar aunque el hijo siga corriendo.
    syncProcess.unref();

    return NextResponse.json({
      success: true,
      message: 'Sincronización iniciada en segundo plano.',
    });
  } catch (error: any) {
    console.error('Error al intentar iniciar el proceso de sincronización:', error);
    return NextResponse.json({ error: 'Error interno al iniciar el script.' }, { status: 500 });
  }
}