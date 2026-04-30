import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import DefaultCut from './pages/DefaultCut';
import DefaultCapture from './pages/DefaultCapture';
import DefaultArrange from './pages/DefaultArrange';
import DefaultDecorate from './pages/DefaultDecorate';
import DefaultSave from './pages/DefaultSave';
import FavoriteCut from './pages/FavoriteCut';
import FavoriteArrange from './pages/FavoriteArrange';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/default" element={<DefaultCut />} />
      <Route path="/default/capture" element={<DefaultCapture />} />
      <Route path="/default/arrange" element={<DefaultArrange />} />
      <Route path="/default/decorate" element={<DefaultDecorate />} />
      <Route path="/default/save" element={<DefaultSave />} />
      <Route path="/favorite" element={<FavoriteCut />} />
      <Route path="/favorite/arrange" element={<FavoriteArrange />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
