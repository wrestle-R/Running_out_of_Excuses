import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Section3 from './components/Section3'

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/runs" element={<Section3 />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  )
}

export default App