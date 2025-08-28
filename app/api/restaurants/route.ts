import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Zod schemas for validation
const CreateRestaurantSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters').max(255),
  description: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('SE'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  website: z.string().url('Invalid website URL').optional(),
  cuisine_type: z.string().optional(),
  price_range: z.number().int().min(1).max(4).optional(),
  capacity: z.number().int().positive().optional(),
  opening_hours: z.record(z.any()).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const UpdateRestaurantSchema = CreateRestaurantSchema.partial().extend({
  id: z.string().uuid('Invalid restaurant ID'),
});

const RestaurantQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default(1),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
  search: z.string().optional(),
  city: z.string().optional(),
  cuisine_type: z.string().optional(),
  is_active: z.string().transform(val => val === 'true').optional(),
  is_verified: z.string().transform(val => val === 'true').optional(),
});

// Helper function to create Supabase client
function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

// Helper function to get authenticated user
async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  const supabase = createSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }
  
  return user;
}

// Helper function to check restaurant ownership
async function checkRestaurantOwnership(restaurantId: string, userId: string) {
  const supabase = createSupabaseClient();
  
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('id, owner_id')
    .eq('id', restaurantId)
    .single();
  
  if (error || !restaurant) {
    throw new Error('Restaurant not found');
  }
  
  if (restaurant.owner_id !== userId) {
    throw new Error('Unauthorized access to restaurant');
  }
  
  return restaurant;
}

// GET /api/restaurants - List restaurants
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = RestaurantQuerySchema.parse(Object.fromEntries(searchParams));
    
    const supabase = createSupabaseClient();
    
    // Build query
    let queryBuilder = supabase
      .from('restaurants')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (query.search) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }
    
    if (query.city) {
      queryBuilder = queryBuilder.eq('city', query.city);
    }
    
    if (query.cuisine_type) {
      queryBuilder = queryBuilder.eq('cuisine_type', query.cuisine_type);
    }
    
    if (query.is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', query.is_active);
    }
    
    if (query.is_verified !== undefined) {
      queryBuilder = queryBuilder.eq('is_verified', query.is_verified);
    }
    
    // Apply pagination
    const offset = (query.page - 1) * query.limit;
    queryBuilder = queryBuilder
      .range(offset, offset + query.limit - 1)
      .order('created_at', { ascending: false });
    
    const { data: restaurants, error, count } = await queryBuilder;
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch restaurants' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      restaurants: restaurants || [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / query.limit),
      },
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('GET /api/restaurants error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/restaurants - Create restaurant
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const restaurantData = CreateRestaurantSchema.parse(body);
    
    const supabase = createSupabaseClient();
    
    // Create restaurant with owner_id
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .insert({
        ...restaurantData,
        owner_id: user.id,
        slug: restaurantData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      
      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.message.includes('slug')) {
          return NextResponse.json(
            { error: 'Restaurant with this name already exists' },
            { status: 409 }
          );
        }
        if (error.message.includes('email')) {
          return NextResponse.json(
            { error: 'Restaurant with this email already exists' },
            { status: 409 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to create restaurant' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { restaurant },
      { status: 201 }
    );
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message.includes('authorization')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('POST /api/restaurants error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/restaurants - Update restaurant
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const updateData = UpdateRestaurantSchema.parse(body);
    
    // Check ownership
    await checkRestaurantOwnership(updateData.id, user.id);
    
    const supabase = createSupabaseClient();
    
    // Remove id from update data
    const { id, ...updateFields } = updateData;
    
    // Update restaurant
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      
      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.message.includes('slug')) {
          return NextResponse.json(
            { error: 'Restaurant with this name already exists' },
            { status: 409 }
          );
        }
        if (error.message.includes('email')) {
          return NextResponse.json(
            { error: 'Restaurant with this email already exists' },
            { status: 409 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to update restaurant' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ restaurant });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('authorization')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Restaurant not found' },
          { status: 404 }
        );
      }
      if (error.message.includes('Unauthorized access')) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }
    
    console.error('PUT /api/restaurants error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/restaurants - Delete restaurant
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('id');
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(restaurantId).success) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID format' },
        { status: 400 }
      );
    }
    
    // Check ownership
    await checkRestaurantOwnership(restaurantId, user.id);
    
    const supabase = createSupabaseClient();
    
    // Delete restaurant (RLS will handle authorization)
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', restaurantId);
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete restaurant' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'Restaurant deleted successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('authorization')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Restaurant not found' },
          { status: 404 }
        );
      }
      if (error.message.includes('Unauthorized access')) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }
    
    console.error('DELETE /api/restaurants error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
