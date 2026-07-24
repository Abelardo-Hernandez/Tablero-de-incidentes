import {
    createContext,
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    cerrarSesion as cerrarSesionServicio,
    obtenerSesion,
    obtenerToken,
    obtenerUsuarioGuardado
} from '../services/auth.service';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(
        obtenerUsuarioGuardado()
    );

    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        async function validarSesion() {
            const token = obtenerToken();

            if (!token) {
                setUsuario(null);
                setCargando(false);
                return;
            }

            try {
                const respuesta = await obtenerSesion();
                setUsuario(respuesta.data);
            } catch {
                cerrarSesionServicio();
                setUsuario(null);
            } finally {
                setCargando(false);
            }
        }

        validarSesion();
    }, []);

    function actualizarUsuario(nuevoUsuario) {
        setUsuario(nuevoUsuario);
    }

    function cerrarSesion() {
        cerrarSesionServicio();
        setUsuario(null);
    }

    const valor = useMemo(
        () => ({
            usuario,
            cargando,
            actualizarUsuario,
            cerrarSesion
        }),
        [usuario, cargando]
    );

    return (
        <AuthContext.Provider value={valor}>
            {children}
        </AuthContext.Provider>
    );
}