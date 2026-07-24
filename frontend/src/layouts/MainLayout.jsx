import {
    useState
} from 'react';

import {
    Outlet
} from 'react-router';

import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

import useAuth from '../hooks/useAuth';

function MainLayout() {
    const { usuario } = useAuth();

    const [sidebarColapsado, setSidebarColapsado] =
        useState(false);

    const [menuMovilAbierto, setMenuMovilAbierto] =
        useState(false);

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

                <main className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default MainLayout;
