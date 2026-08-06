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
import ConfiguracionPage from './pages/configuracion/ConfiguracionPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import LineasPage from './pages/lineas/LineasPage';
import NotFoundPage from './pages/NotFoundPage';
import ReportesPage from './pages/reportes/ReportesPage';
import TiposFallaPage from './pages/tipos-falla/TiposFallaPage';
import TurnosPage from './pages/turnos/TurnosPage';
import TvPage from './pages/tv/TvPage';

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
                            element={
                                <ProtectedRoute requiereResponsableArea />
                            }
                        >
                            <Route
                                index
                                element={<DashboardPage />}
                            />
                        </Route>

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
                            path="tipos-falla"
                            element={<TiposFallaPage />}
                        />

                        <Route
                            element={
                                <ProtectedRoute requiereResponsableArea />
                            }
                        >
                            <Route
                                path="reportes"
                                element={<ReportesPage />}
                            />
                        </Route>

                        <Route
                            path="tv"
                            element={<TvPage />}
                        />

                        <Route
                            path="configuracion"
                            element={<ConfiguracionPage />}
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
