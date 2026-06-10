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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      tblClasificacionGrupo: {
        Row: {
          asignado_por: string | null
          creado_en: string
          equipo_id: string
          grupo: string
          posicion: number
          torneo_id: string
        }
        Insert: {
          asignado_por?: string | null
          creado_en?: string
          equipo_id: string
          grupo: string
          posicion: number
          torneo_id: string
        }
        Update: {
          asignado_por?: string | null
          creado_en?: string
          equipo_id?: string
          grupo?: string
          posicion?: number
          torneo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblClasificacionGrupo_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "tblEquipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblClasificacionGrupo_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "tblTorneos"
            referencedColumns: ["id"]
          },
        ]
      }
      tblEquipos: {
        Row: {
          bandera_url: string | null
          codigo_iso: string | null
          creado_en: string
          grupo: string | null
          id: string
          nombre: string
          torneo_id: string
        }
        Insert: {
          bandera_url?: string | null
          codigo_iso?: string | null
          creado_en?: string
          grupo?: string | null
          id?: string
          nombre: string
          torneo_id: string
        }
        Update: {
          bandera_url?: string | null
          codigo_iso?: string | null
          creado_en?: string
          grupo?: string | null
          id?: string
          nombre?: string
          torneo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblEquipos_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "tblTorneos"
            referencedColumns: ["id"]
          },
        ]
      }
      tblGrupoPartidos: {
        Row: {
          grupo_id: string
          partido_id: string
        }
        Insert: {
          grupo_id: string
          partido_id: string
        }
        Update: {
          grupo_id?: string
          partido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblGrupoPartidos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "tblGrupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblGrupoPartidos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "tblPartidos"
            referencedColumns: ["id"]
          },
        ]
      }
      tblGrupos: {
        Row: {
          actualizado_en: string
          codigo_invitacion: string
          creado_en: string
          creador_id: string
          descripcion: string | null
          id: string
          nombre: string
          torneo_id: string
        }
        Insert: {
          actualizado_en?: string
          codigo_invitacion: string
          creado_en?: string
          creador_id: string
          descripcion?: string | null
          id?: string
          nombre: string
          torneo_id: string
        }
        Update: {
          actualizado_en?: string
          codigo_invitacion?: string
          creado_en?: string
          creador_id?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          torneo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblGrupos_creador_id_fkey"
            columns: ["creador_id"]
            isOneToOne: false
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblGrupos_creador_id_fkey"
            columns: ["creador_id"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tblGrupos_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "tblTorneos"
            referencedColumns: ["id"]
          },
        ]
      }
      tblParticipantes: {
        Row: {
          grupo_id: string
          id: string
          pago_realizado: boolean
          rol: Database["public"]["Enums"]["rol_participante"]
          unido_en: string
          usuario_id: string
        }
        Insert: {
          grupo_id: string
          id?: string
          pago_realizado?: boolean
          rol?: Database["public"]["Enums"]["rol_participante"]
          unido_en?: string
          usuario_id: string
        }
        Update: {
          grupo_id?: string
          id?: string
          pago_realizado?: boolean
          rol?: Database["public"]["Enums"]["rol_participante"]
          unido_en?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblParticipantes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "tblGrupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblParticipantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblParticipantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tblPartidos: {
        Row: {
          ciudad: string | null
          creado_en: string
          equipo_local_id: string | null
          equipo_visitante_id: string | null
          estadio: string | null
          estado: string
          fase: Database["public"]["Enums"]["fase_torneo"]
          fecha_hora: string
          goles_local: number | null
          goles_visitante: number | null
          grupo: string | null
          id: string
          numero_partido: number
          placeholder_local: string | null
          placeholder_visitante: string | null
          torneo_id: string
        }
        Insert: {
          ciudad?: string | null
          creado_en?: string
          equipo_local_id?: string | null
          equipo_visitante_id?: string | null
          estadio?: string | null
          estado?: string
          fase: Database["public"]["Enums"]["fase_torneo"]
          fecha_hora: string
          goles_local?: number | null
          goles_visitante?: number | null
          grupo?: string | null
          id?: string
          numero_partido: number
          placeholder_local?: string | null
          placeholder_visitante?: string | null
          torneo_id: string
        }
        Update: {
          ciudad?: string | null
          creado_en?: string
          equipo_local_id?: string | null
          equipo_visitante_id?: string | null
          estadio?: string | null
          estado?: string
          fase?: Database["public"]["Enums"]["fase_torneo"]
          fecha_hora?: string
          goles_local?: number | null
          goles_visitante?: number | null
          grupo?: string | null
          id?: string
          numero_partido?: number
          placeholder_local?: string | null
          placeholder_visitante?: string | null
          torneo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblPartidos_equipo_local_id_fkey"
            columns: ["equipo_local_id"]
            isOneToOne: false
            referencedRelation: "tblEquipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblPartidos_equipo_visitante_id_fkey"
            columns: ["equipo_visitante_id"]
            isOneToOne: false
            referencedRelation: "tblEquipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblPartidos_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "tblTorneos"
            referencedColumns: ["id"]
          },
        ]
      }
      tblPredicciones: {
        Row: {
          actualizado_en: string
          creado_en: string
          goles_local: number
          goles_visitante: number
          id: string
          participante_id: string
          partido_id: string
          prediccion_unica: boolean
          puntos_obtenidos: number
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          goles_local: number
          goles_visitante: number
          id?: string
          participante_id: string
          partido_id: string
          prediccion_unica?: boolean
          puntos_obtenidos?: number
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          goles_local?: number
          goles_visitante?: number
          id?: string
          participante_id?: string
          partido_id?: string
          prediccion_unica?: boolean
          puntos_obtenidos?: number
        }
        Relationships: [
          {
            foreignKeyName: "tblPredicciones_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "tblParticipantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblPredicciones_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["participante_id"]
          },
          {
            foreignKeyName: "tblPredicciones_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "vwTablaPosiciones"
            referencedColumns: ["participante_id"]
          },
          {
            foreignKeyName: "tblPredicciones_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "tblPartidos"
            referencedColumns: ["id"]
          },
        ]
      }
      tblProfiles: {
        Row: {
          actualizado_en: string
          avatar_url: string | null
          creado_en: string
          email: string
          id: string
          nombre_completo: string | null
          nombre_confirmado: boolean
        }
        Insert: {
          actualizado_en?: string
          avatar_url?: string | null
          creado_en?: string
          email: string
          id: string
          nombre_completo?: string | null
          nombre_confirmado?: boolean
        }
        Update: {
          actualizado_en?: string
          avatar_url?: string | null
          creado_en?: string
          email?: string
          id?: string
          nombre_completo?: string | null
          nombre_confirmado?: boolean
        }
        Relationships: []
      }
      tblReglasGrupo: {
        Row: {
          actualizado_en: string
          bono_cuartos: number
          bono_dieciseisavos: number
          bono_final: number
          bono_octavos: number
          bono_semifinales: number
          creado_en: string
          criterios_desempate: string[]
          grupo_id: string
          minutos_cierre_prediccion: number
          premio_primer_lugar: number
          premio_segundo_lugar: number
          premio_tercer_lugar: number
          pts_ganador: number
          pts_gol_acertado: number
          pts_marcador_exacto: number
          pts_prediccion_unica: number
          valor_apuesta: number
        }
        Insert: {
          actualizado_en?: string
          bono_cuartos?: number
          bono_dieciseisavos?: number
          bono_final?: number
          bono_octavos?: number
          bono_semifinales?: number
          creado_en?: string
          criterios_desempate?: string[]
          grupo_id: string
          minutos_cierre_prediccion?: number
          premio_primer_lugar?: number
          premio_segundo_lugar?: number
          premio_tercer_lugar?: number
          pts_ganador?: number
          pts_gol_acertado?: number
          pts_marcador_exacto?: number
          pts_prediccion_unica?: number
          valor_apuesta?: number
        }
        Update: {
          actualizado_en?: string
          bono_cuartos?: number
          bono_dieciseisavos?: number
          bono_final?: number
          bono_octavos?: number
          bono_semifinales?: number
          creado_en?: string
          criterios_desempate?: string[]
          grupo_id?: string
          minutos_cierre_prediccion?: number
          premio_primer_lugar?: number
          premio_segundo_lugar?: number
          premio_tercer_lugar?: number
          pts_ganador?: number
          pts_gol_acertado?: number
          pts_marcador_exacto?: number
          pts_prediccion_unica?: number
          valor_apuesta?: number
        }
        Relationships: [
          {
            foreignKeyName: "tblReglasGrupo_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: true
            referencedRelation: "tblGrupos"
            referencedColumns: ["id"]
          },
        ]
      }
      tblSuperadmins: {
        Row: {
          creado_en: string
          email: string
        }
        Insert: {
          creado_en?: string
          email: string
        }
        Update: {
          creado_en?: string
          email?: string
        }
        Relationships: []
      }
      tblTorneos: {
        Row: {
          activo: boolean
          codigo: string
          creado_en: string
          descripcion: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          nombre: string
          pais_sede: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          creado_en?: string
          descripcion?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          nombre: string
          pais_sede?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          creado_en?: string
          descripcion?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          nombre?: string
          pais_sede?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vwEstadisticasPartidoGanadorGlobal: {
        Row: {
          partido_id: string | null
          pct_empate: number | null
          pct_local: number | null
          pct_visitante: number | null
          predicciones_empate: number | null
          predicciones_local: number | null
          predicciones_visitante: number | null
          total_predicciones: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tblPredicciones_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "tblPartidos"
            referencedColumns: ["id"]
          },
        ]
      }
      vwEstadisticasPartidoGanadorGrupo: {
        Row: {
          grupo_id: string | null
          partido_id: string | null
          pct_empate: number | null
          pct_local: number | null
          pct_visitante: number | null
          predicciones_empate: number | null
          predicciones_local: number | null
          predicciones_visitante: number | null
          total_predicciones: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tblParticipantes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "tblGrupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblPredicciones_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "tblPartidos"
            referencedColumns: ["id"]
          },
        ]
      }
      vwEstadisticasPartidoMarcadoresGlobal: {
        Row: {
          cantidad: number | null
          goles_local: number | null
          goles_visitante: number | null
          partido_id: string | null
          porcentaje: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tblPredicciones_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "tblPartidos"
            referencedColumns: ["id"]
          },
        ]
      }
      vwEstadisticasPartidoMarcadoresGrupo: {
        Row: {
          cantidad: number | null
          goles_local: number | null
          goles_visitante: number | null
          grupo_id: string | null
          partido_id: string | null
          porcentaje: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tblParticipantes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "tblGrupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblPredicciones_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "tblPartidos"
            referencedColumns: ["id"]
          },
        ]
      }
      vwPrediccionesGrupoPartido: {
        Row: {
          avatar_url: string | null
          goles_local: number | null
          goles_visitante: number | null
          grupo_id: string | null
          nombre_completo: string | null
          participante_id: string | null
          partido_id: string | null
          prediccion_unica: boolean | null
          puntos_obtenidos: number | null
          usuario_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tblParticipantes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "tblGrupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblPredicciones_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "tblPartidos"
            referencedColumns: ["id"]
          },
        ]
      }
      vwTablaPosiciones: {
        Row: {
          aciertos: number | null
          avatar_url: string | null
          grupo_id: string | null
          marcadores_exactos: number | null
          nombre_completo: string | null
          participante_id: string | null
          posicion: number | null
          puntos_totales: number | null
          unicas_acertadas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tblParticipantes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "tblGrupos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      buscar_grupo: {
        Args: { p_codigo: string }
        Returns: {
          descripcion: string
          id: string
          nombre: string
          total_participantes: number
          valor_apuesta: number
          ya_es_miembro: boolean
        }[]
      }
      crear_grupo: {
        Args: {
          p_descripcion: string
          p_nombre: string
          p_partido_ids: string[]
          p_reglas: Json
        }
        Returns: string
      }
      equipo_clasificado: {
        Args: { p_grupo: string; p_pos: number; p_torneo_id: string }
        Returns: string
      }
      es_admin_grupo: { Args: { p_grupo_id: string }; Returns: boolean }
      es_miembro_grupo: { Args: { p_grupo_id: string }; Returns: boolean }
      es_superadmin: { Args: never; Returns: boolean }
      finalizar_partido: {
        Args: {
          p_goles_local: number
          p_goles_visitante: number
          p_partido_id: string
        }
        Returns: undefined
      }
      ganador_partido: {
        Args: { p_ganador: boolean; p_numero: number; p_torneo_id: string }
        Returns: string
      }
      generar_codigo_invitacion: { Args: never; Returns: string }
      grupo_detalle: { Args: { p_grupo_id: string }; Returns: Json }
      inicio_extras: { Args: { p_desde: string }; Returns: Json }
      mis_grupos: {
        Args: never
        Returns: {
          codigo_invitacion: string
          creador_id: string
          descripcion: string
          id: string
          lider_nombre: string
          mi_posicion: number
          mis_aciertos: number
          mis_exactos: number
          mis_puntos: number
          nombre: string
          torneo_activo: boolean
          torneo_codigo: string
          torneo_fecha_fin: string
          torneo_fecha_inicio: string
          torneo_id: string
          torneo_nombre: string
          torneo_pais_sede: string
          total_participantes: number
          valor_apuesta: number
        }[]
      }
      partido_cerrado: {
        Args: { p_grupo_id: string; p_partido_id: string }
        Returns: boolean
      }
      posiciones_admin: {
        Args: { p_torneo_id: string }
        Returns: {
          ambiguo: boolean
          codigo_iso: string
          dg: number
          equipo_id: string
          gc: number
          gf: number
          grupo: string
          manual_posicion: number
          nombre: string
          pe: number
          pg: number
          pj: number
          posicion: number
          pp: number
          pts: number
        }[]
      }
      posiciones_grupo: {
        Args: { p_grupo: string; p_torneo_id: string }
        Returns: {
          ambiguo: boolean
          dg: number
          equipo_id: string
          gc: number
          gf: number
          pe: number
          pg: number
          pj: number
          posicion: number
          pp: number
          pts: number
        }[]
      }
      resolver_cruces: { Args: { p_torneo_id: string }; Returns: undefined }
      resolver_placeholder: {
        Args: { p_ph: string; p_torneo_id: string }
        Returns: string
      }
      revertir_partido: { Args: { p_partido_id: string }; Returns: undefined }
      superadmin_listar_pollas: { Args: never; Returns: Json }
    }
    Enums: {
      fase_torneo:
        | "fase_grupos"
        | "dieciseisavos"
        | "octavos"
        | "cuartos"
        | "semifinales"
        | "tercer_lugar"
        | "final"
      rol_participante: "admin" | "jugador"
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
      fase_torneo: [
        "fase_grupos",
        "dieciseisavos",
        "octavos",
        "cuartos",
        "semifinales",
        "tercer_lugar",
        "final",
      ],
      rol_participante: ["admin", "jugador"],
    },
  },
} as const
