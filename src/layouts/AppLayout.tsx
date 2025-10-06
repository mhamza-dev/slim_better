import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppLayout() {
    const { user, signOut } = useAuth()

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fbff' }}>
            <aside style={{ width: 240, background: 'white', borderRight: '1px solid #e6eef8', padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#0b5fff', marginBottom: 16 }}>Slim Better</div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <NavLink to="/dashboard" style={({ isActive }) => ({
                        padding: '10px 12px',
                        borderRadius: 8,
                        color: isActive ? 'white' : '#0b5fff',
                        background: isActive ? '#0b5fff' : 'transparent',
                        textDecoration: 'none',
                        fontWeight: 600,
                    })}>Dashboard</NavLink>
                    <NavLink to="/patients" style={({ isActive }) => ({
                        padding: '10px 12px',
                        borderRadius: 8,
                        color: isActive ? 'white' : '#0b5fff',
                        background: isActive ? '#0b5fff' : 'transparent',
                        textDecoration: 'none',
                        fontWeight: 600,
                    })}>Patients</NavLink>
                </nav>
                <div style={{ marginTop: 'auto' }} />
            </aside>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #e6eef8' }}>
                    <div style={{ fontWeight: 600, color: '#09357b' }}>Welcome{user?.email ? `, ${user.email}` : ''}</div>
                    <button onClick={signOut} style={{ border: 'none', background: '#0b5fff', color: 'white', padding: '8px 12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Sign out</button>
                </header>
                <main style={{ padding: 20 }}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}


