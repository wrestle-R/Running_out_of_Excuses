import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Section3 from './pages/Runs'
import Refresh from "./pages/Refresh"
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/runs" element={<Section3 />} />
        <Route path="/" element={<Home />} />
        <Route path="/refresh" element={<Refresh />} />

      </Routes>
    </Router>
  )
}

export default App