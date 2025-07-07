import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Section3 from './pages/Runs'
import StravaActivities from './components/StravaActivities'

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/runs" element={<Section3 />} />
        <Route path="/strava" element={<StravaActivities />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  )
}

export default App