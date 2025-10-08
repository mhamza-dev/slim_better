import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
    children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
    const location = useLocation()
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [displayLocation, setDisplayLocation] = useState(location)

    useEffect(() => {
        if (location !== displayLocation) {
            setIsTransitioning(true)

            const timer = setTimeout(() => {
                setDisplayLocation(location)
                setIsTransitioning(false)
            }, 150) // Half of the transition duration

            return () => clearTimeout(timer)
        }
    }, [location, displayLocation])

    return (
        <div className={`min-h-[calc(100vh-5rem)] route-transition ${isTransitioning ? 'route-transition-exit-active' : 'route-transition-enter-active'}`}>
            {children}
        </div>
    )
}
