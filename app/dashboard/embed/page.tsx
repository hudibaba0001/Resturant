import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import EmbedClient from './EmbedClient'

export default async function EmbedPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Get user's restaurant access
  const { data: userRestaurants } = await supabase
    .from('restaurant_staff')
    .select(`
      role,
      restaurants (
        id,
        name,
        is_active,
        is_verified
      )
    `)
    .eq('user_id', session.user.id)

  const restaurant = userRestaurants?.[0]?.restaurants as any
  const userRole = userRestaurants?.[0]?.role || 'viewer'

  if (!restaurant || !restaurant.is_active || !restaurant.is_verified) {
    redirect('/login')
  }

  // Check restaurant status
  const { data: isOpen } = await supabase.rpc('is_restaurant_open', {
    p_restaurant_id: restaurant.id
  })

  const embedSnippet = `<script src="${process.env.NEXT_PUBLIC_WIDGET_ORIGIN || 'http://localhost:3002'}/widget.js" data-restaurant="${restaurant.id}" defer></script>`

  return (
    <EmbedClient 
      restaurant={restaurant}
      isOpen={isOpen}
      embedSnippet={embedSnippet}
    />
  )
}
