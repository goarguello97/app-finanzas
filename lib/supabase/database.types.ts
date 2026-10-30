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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      aportes_meta: {
        Row: {
          created_at: string
          fecha: string
          id: string
          meta_id: string
          monto: number
          user_id: string
        }
        Insert: {
          created_at?: string
          fecha?: string
          id?: string
          meta_id: string
          monto: number
          user_id?: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          meta_id?: string
          monto?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aportes_meta_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aportes_meta_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas_progreso"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          created_at: string
          excluye_totales: boolean
          id: string
          nombre: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          excluye_totales?: boolean
          id?: string
          nombre: string
          tipo: string
          user_id?: string
        }
        Update: {
          created_at?: string
          excluye_totales?: boolean
          id?: string
          nombre?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          estrategia_deudas: string
          exchange_cotizacion: string | null
          ingreso_minimo: number | null
          moneda_base: string
          updated_at: string
          user_id: string
        }
        Insert: {
          estrategia_deudas?: string
          exchange_cotizacion?: string | null
          ingreso_minimo?: number | null
          moneda_base?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          estrategia_deudas?: string
          exchange_cotizacion?: string | null
          ingreso_minimo?: number | null
          moneda_base?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cotizaciones: {
        Row: {
          activo: string
          compra: number
          created_at: string
          fecha: string
          fuente: string
          id: number
          venta: number
        }
        Insert: {
          activo?: string
          compra: number
          created_at?: string
          fecha?: string
          fuente: string
          id?: never
          venta: number
        }
        Update: {
          activo?: string
          compra?: number
          created_at?: string
          fecha?: string
          fuente?: string
          id?: never
          venta?: number
        }
        Relationships: []
      }
      cuentas: {
        Row: {
          archivada: boolean
          created_at: string
          dia_cierre: number | null
          dia_vencimiento: number | null
          id: string
          limite: number | null
          moneda: string
          nombre: string
          saldo_inicial: number
          tipo: string
          user_id: string
        }
        Insert: {
          archivada?: boolean
          created_at?: string
          dia_cierre?: number | null
          dia_vencimiento?: number | null
          id?: string
          limite?: number | null
          moneda?: string
          nombre: string
          saldo_inicial?: number
          tipo: string
          user_id?: string
        }
        Update: {
          archivada?: boolean
          created_at?: string
          dia_cierre?: number | null
          dia_vencimiento?: number | null
          id?: string
          limite?: number | null
          moneda?: string
          nombre?: string
          saldo_inicial?: number
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      deudas: {
        Row: {
          acreedor: string
          created_at: string
          cuotas_total: number | null
          descripcion: string | null
          dia_vencimiento: number | null
          estado: string
          fecha_inicio: string
          id: string
          moneda: string
          monto_cuota: number | null
          monto_total: number
          pago_minimo: number | null
          tasa_anual: number | null
          tipo: string
          user_id: string
        }
        Insert: {
          acreedor: string
          created_at?: string
          cuotas_total?: number | null
          descripcion?: string | null
          dia_vencimiento?: number | null
          estado?: string
          fecha_inicio?: string
          id?: string
          moneda?: string
          monto_cuota?: number | null
          monto_total: number
          pago_minimo?: number | null
          tasa_anual?: number | null
          tipo: string
          user_id?: string
        }
        Update: {
          acreedor?: string
          created_at?: string
          cuotas_total?: number | null
          descripcion?: string | null
          dia_vencimiento?: number | null
          estado?: string
          fecha_inicio?: string
          id?: string
          moneda?: string
          monto_cuota?: number | null
          monto_total?: number
          pago_minimo?: number | null
          tasa_anual?: number | null
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      metas: {
        Row: {
          completada: boolean
          created_at: string
          fecha_objetivo: string | null
          id: string
          moneda: string
          nombre: string
          objetivo: number
          user_id: string
        }
        Insert: {
          completada?: boolean
          created_at?: string
          fecha_objetivo?: string | null
          id?: string
          moneda?: string
          nombre: string
          objetivo: number
          user_id?: string
        }
        Update: {
          completada?: boolean
          created_at?: string
          fecha_objetivo?: string | null
          id?: string
          moneda?: string
          nombre?: string
          objetivo?: number
          user_id?: string
        }
        Relationships: []
      }
      movimientos: {
        Row: {
          categoria_id: string | null
          created_at: string
          cuenta_id: string
          cuotas: number
          fecha: string
          id: string
          monto: number
          nota: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          cuenta_id: string
          cuotas?: number
          fecha?: string
          id?: string
          monto: number
          nota?: string | null
          tipo: string
          user_id?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          cuenta_id?: string
          cuotas?: number
          fecha?: string
          id?: string
          monto?: number
          nota?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "saldos_cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_deuda: {
        Row: {
          created_at: string
          deuda_id: string
          fecha: string
          id: string
          interes: number
          monto: number
          movimiento_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deuda_id: string
          fecha?: string
          id?: string
          interes?: number
          monto: number
          movimiento_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          deuda_id?: string
          fecha?: string
          id?: string
          interes?: number
          monto?: number
          movimiento_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_deuda_deuda_id_fkey"
            columns: ["deuda_id"]
            isOneToOne: false
            referencedRelation: "deudas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_deuda_deuda_id_fkey"
            columns: ["deuda_id"]
            isOneToOne: false
            referencedRelation: "deudas_estado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_deuda_deuda_id_fkey"
            columns: ["deuda_id"]
            isOneToOne: false
            referencedRelation: "deudas_saldo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_deuda_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "cuotas_proyectadas"
            referencedColumns: ["movimiento_id"]
          },
          {
            foreignKeyName: "pagos_deuda_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cotizacion_actual: {
        Row: {
          activo: string | null
          compra: number | null
          created_at: string | null
          fecha: string | null
          fuente: string | null
          id: number | null
          venta: number | null
        }
        Relationships: []
      }
      cuotas_proyectadas: {
        Row: {
          cuenta_id: string | null
          cuotas: number | null
          mes: string | null
          monto_cuota: number | null
          movimiento_id: string | null
          nro_cuota: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "saldos_cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      deudas_estado: {
        Row: {
          acreedor: string | null
          created_at: string | null
          cuotas_restantes: number | null
          cuotas_total: number | null
          descripcion: string | null
          dia_vencimiento: number | null
          estado: string | null
          fecha_inicio: string | null
          id: string | null
          moneda: string | null
          monto_cuota: number | null
          monto_total: number | null
          pagado: number | null
          pago_minimo: number | null
          pagos_realizados: number | null
          pendiente: number | null
          tasa_anual: number | null
          tipo: string | null
          user_id: string | null
        }
        Relationships: []
      }
      deudas_saldo: {
        Row: {
          acreedor: string | null
          capital_pagado: number | null
          created_at: string | null
          cuotas_total: number | null
          descripcion: string | null
          dia_vencimiento: number | null
          estado: string | null
          fecha_inicio: string | null
          id: string | null
          interes_pagado: number | null
          moneda: string | null
          monto_cuota: number | null
          monto_total: number | null
          pagado: number | null
          pago_minimo: number | null
          pagos_realizados: number | null
          pendiente: number | null
          tasa_anual: number | null
          tipo: string | null
          user_id: string | null
        }
        Relationships: []
      }
      extra_mensual: {
        Row: {
          extra: number | null
          ingreso_minimo: number | null
          ingresos: number | null
          mes: string | null
          user_id: string | null
        }
        Relationships: []
      }
      metas_progreso: {
        Row: {
          aportado: number | null
          completada: boolean | null
          created_at: string | null
          fecha_objetivo: string | null
          id: string | null
          moneda: string | null
          nombre: string | null
          objetivo: number | null
          porcentaje: number | null
          user_id: string | null
        }
        Relationships: []
      }
      resumen_mensual: {
        Row: {
          mes: string | null
          moneda: string | null
          tipo: string | null
          total: number | null
          user_id: string | null
        }
        Relationships: []
      }
      saldos_cuentas: {
        Row: {
          archivada: boolean | null
          created_at: string | null
          dia_cierre: number | null
          dia_vencimiento: number | null
          id: string | null
          limite: number | null
          moneda: string | null
          nombre: string | null
          saldo_actual: number | null
          saldo_inicial: number | null
          tipo: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      eliminar_pago_deuda: { Args: { p_pago_id: string }; Returns: undefined }
      registrar_pago_deuda: {
        Args: {
          p_categoria_id?: string
          p_cuenta_id?: string
          p_deuda_id: string
          p_fecha: string
          p_interes?: number
          p_monto: number
          p_nota?: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
