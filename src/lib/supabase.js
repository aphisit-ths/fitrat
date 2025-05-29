import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Fixed user ID for Oat (single user app)
export const USER_ID = 'oat-fitness-journey'

// Helper functions for data operations
export const profileService = {
  async getProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', USER_ID)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async updateProfile(profileData) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: USER_ID, ...profileData, updated_at: new Date().toISOString() })
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

export const weightService = {
  async getWeightEntries() {
    const { data, error } = await supabase
      .from('weight_entries')
      .select('*')
      .eq('user_id', USER_ID)
      .order('date', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async addWeightEntry(date, weight) {
    const { data, error } = await supabase
      .from('weight_entries')
      .upsert({ user_id: USER_ID, date, weight })
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

export const workoutService = {
  async getWorkoutEntries() {
    const { data, error } = await supabase
      .from('workout_entries')
      .select('*')
      .eq('user_id', USER_ID)
      .order('date', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async upsertWorkoutEntry(date, workoutData) {
    // Map frontend data to database columns
    const dbData = {
      user_id: USER_ID,
      date,
      start_time: workoutData.startTime || null,
      end_time: workoutData.endTime || null,
      duration: workoutData.duration || null,
      intensity: workoutData.intensity || 1,
      workout_type: workoutData.type || 'general',
      completed: workoutData.completed || false,
      actual_seconds: workoutData.actualSeconds || null
    };
    // เพิ่ม id ถ้ามี (เพื่อให้ upsert ไม่ error)
    if (workoutData.id) dbData.id = workoutData.id;

    const { data, error } = await supabase
      .from('workout_entries')
      .upsert(dbData, { onConflict: ['user_id', 'date'] })
      .select()
      .single();

    if (error) throw error
    return data
  },

  async deleteWorkoutEntry(date) {
    const { data, error } = await supabase
      .from('workout_entries')
      .delete()
      .eq('user_id', USER_ID)
      .eq('date', date)
    
    if (error) throw error
    return data
  }
}

// Utility function to check if online and can connect to Supabase
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', USER_ID)
      .single()
    
    return !error
  } catch (error) {
    return false
  }
}
