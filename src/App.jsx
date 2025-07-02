import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import {TimelineDemo} from './pages/Timeline'

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/timeline" element={<TimelineDemo />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  )
}

export default App