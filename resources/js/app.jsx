import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import GamesPage from './pages/GamesPage';
import GameLayout from './pages/GameLayout';
import ScenesPage from './pages/ScenesPage';
import CharactersPage from './pages/CharactersPage';
import AssetsPage from './pages/AssetsPage';
import MapPage from './pages/MapPage';
import PlayPage from './pages/PlayPage';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5000 },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<GamesPage />} />
                    <Route path="/games/:gameId/play" element={<PlayPage />} />
                    <Route path="/games/:gameId" element={<GameLayout />}>
                        <Route index element={<Navigate to="scenes" replace />} />
                        <Route path="scenes" element={<ScenesPage />} />
                        <Route path="map" element={<MapPage />} />
                        <Route path="characters" element={<CharactersPage />} />
                        <Route path="assets" element={<AssetsPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

createRoot(document.getElementById('root')).render(<App />);
