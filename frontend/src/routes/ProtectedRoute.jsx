import {
    Navigate,
    Outlet
} from 'react-router';

import useAuth from '../hooks/useAuth';

function ProtectedRoute({
    requiereResponsableArea = false
}) {
    const {
        usuario,
        cargando
    } = useAuth();

    if (cargando) {
        return (
            <main className="grid min-h-screen place-items-center bg-slate-950">
                <div className="text-center">
                    <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/20 border-t-emerald-500" />

                    <p className="mt-4 text-sm font-semibold text-slate-300">
                        Validando sesión...
                    </p>
                </div>
            </main>
        );
    }

    if (!usuario) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    if (
        requiereResponsableArea &&
        usuario.rol !== 'administrador' &&
        !usuario.es_lider
    ) {
        return (
            <Navigate
                to="/incidencias"
                replace
            />
        );
    }

    return <Outlet />;
}

export default ProtectedRoute;
