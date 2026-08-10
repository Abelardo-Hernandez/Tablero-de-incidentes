import api from './api';

function urlBase64AUint8Array(valor) {
    const relleno = '='.repeat((4 - valor.length % 4) % 4);
    const base64 = (valor + relleno)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const datos = window.atob(base64);
    const salida = new Uint8Array(datos.length);

    for (let indice = 0; indice < datos.length; indice += 1) {
        salida[indice] = datos.charCodeAt(indice);
    }

    return salida;
}

export function pushEsCompatible() {
    return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

export async function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return null;
    }

    return navigator.serviceWorker.register('/service-worker.js');
}

export async function activarPush() {
    if (!pushEsCompatible()) {
        return {
            disponible: false,
            permiso: 'unsupported'
        };
    }

    const permiso = await window.Notification.requestPermission();

    if (permiso !== 'granted') {
        return {
            disponible: true,
            permiso
        };
    }

    const { data } = await api.get('/push/configuracion');
    const publicKey = data?.data?.publicKey;

    if (!data?.data?.disponible || !publicKey) {
        return {
            disponible: false,
            permiso
        };
    }

    const registro = await registrarServiceWorker();
    const suscripcionActual =
        await registro.pushManager.getSubscription();
    const suscripcion =
        suscripcionActual ||
        await registro.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64AUint8Array(publicKey)
        });

    await api.post('/push/suscripciones', {
        subscription: suscripcion
    });

    return {
        disponible: true,
        permiso,
        suscrito: true
    };
}

export async function registrarPwa() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        registrarServiceWorker().catch((error) => {
            console.warn(
                'No fue posible registrar el service worker:',
                error
            );
        });
    });
}
