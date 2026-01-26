import { Link } from 'react-router-dom'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <h2 className="logo">ExpenseApp</h2>

      <nav className="nav">
        <Link to="/">Home</Link>
        <Link to="/get-expense">Expenses</Link>
      </nav>
    </header>
  )
}

export default Header
