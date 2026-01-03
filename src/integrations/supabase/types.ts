export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data_hora: string
          duracao_minutos: number
          empresa_id: string
          id: string
          notas: string | null
          profissional_id: string | null
          servico_id: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_hora: string
          duracao_minutos?: number
          empresa_id: string
          id?: string
          notas?: string | null
          profissional_id?: string | null
          servico_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_hora?: string
          duracao_minutos?: number
          empresa_id?: string
          id?: string
          notas?: string | null
          profissional_id?: string | null
          servico_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_empresa: {
        Row: {
          cliente_id: string
          created_at: string | null
          empresa_id: string
          id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          empresa_id: string
          id?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_empresa_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          notas: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome: string
          notas?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          notas?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversas_do_whatsapp: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          empresa_id: string
          id: string
          status: string | null
          telefone: string
          ultimo_contato: string | null
          updated_at: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          empresa_id: string
          id?: string
          status?: string | null
          telefone: string
          ultimo_contato?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          status?: string | null
          telefone?: string
          ultimo_contato?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_do_whatsapp_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_do_whatsapp_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      dias_bloqueados: {
        Row: {
          created_at: string | null
          data: string
          empresa_id: string
          id: string
          motivo: string | null
          profissional_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          empresa_id: string
          id?: string
          motivo?: string | null
          profissional_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          empresa_id?: string
          id?: string
          motivo?: string | null
          profissional_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dias_bloqueados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dias_bloqueados_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          dias_funcionamento: number[] | null
          email: string | null
          endereco: string | null
          estado: string | null
          horario_abertura: string | null
          horario_fechamento: string | null
          id: string
          logo_url: string | null
          nome: string
          slug: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          dias_funcionamento?: number[] | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          slug: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          dias_funcionamento?: number[] | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          slug?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      funcao_usuario: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcao_usuario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_mensagens: {
        Row: {
          conteudo: string
          conversa_id: string
          created_at: string | null
          direcao: string
          id: string
          status: string | null
          tipo: string | null
        }
        Insert: {
          conteudo: string
          conversa_id: string
          created_at?: string | null
          direcao: string
          id?: string
          status?: string | null
          tipo?: string | null
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          created_at?: string | null
          direcao?: string
          id?: string
          status?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas_do_whatsapp"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_do_portfolio: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          empresa_id: string
          id: string
          imagem_url: string
          ordem: number | null
          profissional_id: string | null
          servico_id: string | null
          titulo: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          imagem_url: string
          ordem?: number | null
          profissional_id?: string | null
          servico_id?: string | null
          titulo?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          imagem_url?: string
          ordem?: number | null
          profissional_id?: string | null
          servico_id?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imagens_do_portfolio_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_do_portfolio_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_do_portfolio_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          empresa_id: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimentos_do_cliente: {
        Row: {
          agendamento_id: string | null
          cliente_id: string
          created_at: string | null
          data_procedimento: string | null
          fotos: string[] | null
          id: string
          observacoes: string | null
          profissional_id: string | null
          servico_id: string | null
        }
        Insert: {
          agendamento_id?: string | null
          cliente_id: string
          created_at?: string | null
          data_procedimento?: string | null
          fotos?: string[] | null
          id?: string
          observacoes?: string | null
          profissional_id?: string | null
          servico_id?: string | null
        }
        Update: {
          agendamento_id?: string | null
          cliente_id?: string
          created_at?: string | null
          data_procedimento?: string | null
          fotos?: string[] | null
          id?: string
          observacoes?: string | null
          profissional_id?: string | null
          servico_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedimentos_do_cliente_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedimentos_do_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedimentos_do_cliente_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedimentos_do_cliente_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          cor: string | null
          created_at: string | null
          email: string | null
          empresa_id: string
          especialidade: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          cor?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id: string
          especialidade?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          cor?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string
          especialidade?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_financeiros: {
        Row: {
          agendamento_id: string | null
          categoria: string | null
          cliente_id: string | null
          created_at: string | null
          data_transacao: string
          descricao: string | null
          empresa_id: string
          id: string
          metodo_pagamento: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          agendamento_id?: string | null
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_transacao?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          metodo_pagamento?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tipo: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          agendamento_id?: string | null
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_transacao?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          metodo_pagamento?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "registro_financeiros_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_financeiros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_financeiros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          duracao_minutos: number
          empresa_id: string
          id: string
          nome: string
          preco: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          duracao_minutos?: number
          empresa_id: string
          id?: string
          nome: string
          preco?: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          duracao_minutos?: number
          empresa_id?: string
          id?: string
          nome?: string
          preco?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_of_empresa: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "professional" | "client"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      payment_status: "pending" | "paid" | "refunded" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "professional", "client"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      payment_status: ["pending", "paid", "refunded", "cancelled"],
    },
  },
} as const
