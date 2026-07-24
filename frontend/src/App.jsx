import {
    Navigate,
    Route,
    Routes
} from 'react-router';

import { AuthProvider } from './context/AuthContext';

import MainLayout from './layouts/MainLayout';
import UsuariosPage from './pages/usuarios/UsuariosPage';
import IncidenciasPage from './pages/incidencias/IncidenciasPage';

import LoginPage from './pages/auth/LoginPage';
import AreasPage from './pages/areas/AreasPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import LineasPage from './pages/lineas/LineasPage';
import NotFoundPage from './pages/NotFoundPage';
import PlaceholderPage from './pages/PlaceholderPage';
import TurnosPage from './pages/turnos/TurnosPage';

import ProtectedRoute from './routes/ProtectedRoute';

function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route
                    path="/login"
                    element={<LoginPage />}
                />

                <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout />}>
                        <Route
                            index
                            element={<DashboardPage />}
                        />

                        <Route
                            path="incidencias"
                            element={<IncidenciasPage />}
                        />

                        <Route
                            path="usuarios"
                            element={<UsuariosPage />}
                        />

                        <Route
                            path="areas"
                            element={<AreasPage />}
                        />

                        <Route
                            path="lineas"
                            element={<LineasPage />}
                        />

                        <Route
                            path="turnos"
                            element={<TurnosPage />}
                        />

                        <Route
                            path="reportes"
                            element={
                                <PlaceholderPage
                                    titulo="Reportes"
                                    descripcion="Indicadores, análisis de tiempos y exportaciones."
                                />
                            }
                        />

                        <Route
                            path="configuracion"
                            element={
                                <PlaceholderPage
                                    titulo="Configuración"
                                    descripcion="Personalización del sistema, videos y parámetros generales."
                                />
                            }
                        />
                    </Route>
                </Route>

                <Route
                    path="/inicio"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

                <Route
                    path="*"
                    element={<NotFoundPage />}
                />
            </Routes>
        </AuthProvider>
    );
}

export default App;
