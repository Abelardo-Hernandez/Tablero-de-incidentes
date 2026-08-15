import {
    useEffect,
    useState
} from 'react';

import {
    Outlet
} from 'react-router';

import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import SystemNotifications from '../components/ui/SystemNotifications';

import useAuth from '../hooks/useAuth';
import {
    obtenerConfiguracionGeneral
} from '../services/configuracion.service';
import {
    guardarConfiguracion
} from '../utils/configuracion';

function MainLayout() {
    const { usuario } = useAuth();

    const [sidebarColapsado, setSidebarColapsado] =
        useState(false);

    const [menuMovilAbierto, setMenuMovilAbierto] =
        useState(false);

    useEffect(() => {
        async function cargarConfiguracionServidor() {
            try {
                const respuesta = await obtenerConfiguracionGeneral();
                guardarConfiguracion(respuesta.data || {});
            } catch (error) {
                console.error(
                    'No fue posible cargar la configuracion general:',
                    error
                );
            }
        }

        cargarConfiguracionServidor();
    }, []);

    return (
        <div className="flex h-dvh overflow-hidden bg-[#f4f7fa]">
            <Sidebar
                colapsado={sidebarColapsado}
                setColapsado={setSidebarColapsado}
                abiertoMovil={menuMovilAbierto}
                cerrarMovil={() =>
                    setMenuMovilAbierto(false)
                }
                usuario={usuario}
            />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <Header
                    abrirMenuMovil={() =>
                        setMenuMovilAbierto(true)
                    }
                />

                <main className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-5 lg:px-7">
                    <Outlet />
                </main>

                <SystemNotifications />
            </div>
        </div>
    );
}

export default MainLayout;
