export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_names: {
        Row: {
          created_at: string | null
          gender: string | null
          id: string
          language: string
          name: string
        }
        Insert: {
          created_at?: string | null
          gender?: string | null
          id?: string
          language: string
          name: string
        }
        Update: {
          created_at?: string | null
          gender?: string | null
          id?: string
          language?: string
          name?: string
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          audio_url: string | null
          content: string
          conversation_id: string
          id: string
          metadata: Json | null
          role: string
          timestamp: string | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          conversation_id: string
          id?: string
          metadata?: Json | null
          role: string
          timestamp?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          conversation_id?: string
          id?: string
          metadata?: Json | null
          role?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_name: string
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          language: string
          patient_id: string | null
          started_at: string | null
          status: string | null
          summary: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          language: string
          patient_id?: string | null
          started_at?: string | null
          status?: string | null
          summary?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          language?: string
          patient_id?: string | null
          started_at?: string | null
          status?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          age: number | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          interested_treatments: string[] | null
          language: string | null
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          interested_treatments?: string[] | null
          language?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          interested_treatments?: string[] | null
          language?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      treatments: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          description_en: string | null
          description_tr: string | null
          id: string
          name: string
          name_ar: string | null
          name_de: string | null
          name_en: string | null
          name_fr: string | null
          name_ru: string | null
          name_tr: string | null
          starting_price: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_en?: string | null
          description_tr?: string | null
          id?: string
          name: string
          name_ar?: string | null
          name_de?: string | null
          name_en?: string | null
          name_fr?: string | null
          name_ru?: string | null
          name_tr?: string | null
          starting_price?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_en?: string | null
          description_tr?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          name_de?: string | null
          name_en?: string | null
          name_fr?: string | null
          name_ru?: string | null
          name_tr?: string | null
          starting_price?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

