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
      tblAbonos: {
        Row: {
          creado_en: string
          grupo_id: string
          id: string
          monto: number
          nota: string | null
          participante_id: string
          registrado_por: string | null
        }
        Insert: {
          creado_en?: string
          grupo_id: string
          id?: string
          monto: number
          nota?: string | null
          participante_id: string
          registrado_por?: string | null
        }
        Update: {
          creado_en?: string
          grupo_id?: string
          id?: string
          monto?: number
          nota?: string | null
          participante_id?: string
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tblAbonos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "tblGrupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblAbonos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "tblParticipantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblAbonos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["participante_id"]
          },
          {
            foreignKeyName: "tblAbonos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "vwTablaPosiciones"
            referencedColumns: ["participante_id"]
          },
          {
            foreignKeyName: "tblAbonos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblAbonos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
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
      tblNotificaciones: {
        Row: {
          accion_label: string | null
          audiencia_grupo_id: string | null
          audiencia_tipo: string
          audiencia_usuario_id: string | null
          creada_en: string
          creada_por: string | null
          cuerpo: string
          enviada_en: string | null
          id: string
          imagen_url: string | null
          titulo: string
          total_destinatarios: number
          total_push_enviados: number
          url: string | null
        }
        Insert: {
          accion_label?: string | null
          audiencia_grupo_id?: string | null
          audiencia_tipo: string
          audiencia_usuario_id?: string | null
          creada_en?: string
          creada_por?: string | null
          cuerpo: string
          enviada_en?: string | null
          id?: string
          imagen_url?: string | null
          titulo: string
          total_destinatarios?: number
          total_push_enviados?: number
          url?: string | null
        }
        Update: {
          accion_label?: string | null
          audiencia_grupo_id?: string | null
          audiencia_tipo?: string
          audiencia_usuario_id?: string | null
          creada_en?: string
          creada_por?: string | null
          cuerpo?: string
          enviada_en?: string | null
          id?: string
          imagen_url?: string | null
          titulo?: string
          total_destinatarios?: number
          total_push_enviados?: number
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tblNotificaciones_audiencia_grupo_id_fkey"
            columns: ["audiencia_grupo_id"]
            isOneToOne: false
            referencedRelation: "tblGrupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblNotificaciones_audiencia_usuario_id_fkey"
            columns: ["audiencia_usuario_id"]
            isOneToOne: false
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblNotificaciones_audiencia_usuario_id_fkey"
            columns: ["audiencia_usuario_id"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tblNotificaciones_creada_por_fkey"
            columns: ["creada_por"]
            isOneToOne: false
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblNotificaciones_creada_por_fkey"
            columns: ["creada_por"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tblNotificacionesDestinatarios: {
        Row: {
          creada_en: string
          id: string
          leida_en: string | null
          notificacion_id: string
          usuario_id: string
        }
        Insert: {
          creada_en?: string
          id?: string
          leida_en?: string | null
          notificacion_id: string
          usuario_id: string
        }
        Update: {
          creada_en?: string
          id?: string
          leida_en?: string | null
          notificacion_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblNotificacionesDestinatarios_notificacion_id_fkey"
            columns: ["notificacion_id"]
            isOneToOne: false
            referencedRelation: "tblNotificaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblNotificacionesDestinatarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblNotificacionesDestinatarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tblParticipantes: {
        Row: {
          eliminado_en: string | null
          grupo_id: string
          id: string
          pago_realizado: boolean
          puntos_iniciales: number
          rol: Database["public"]["Enums"]["rol_participante"]
          unido_en: string
          usuario_id: string
        }
        Insert: {
          eliminado_en?: string | null
          grupo_id: string
          id?: string
          pago_realizado?: boolean
          puntos_iniciales?: number
          rol?: Database["public"]["Enums"]["rol_participante"]
          unido_en?: string
          usuario_id: string
        }
        Update: {
          eliminado_en?: string | null
          grupo_id?: string
          id?: string
          pago_realizado?: boolean
          puntos_iniciales?: number
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
      tblParticipantesBaneados: {
        Row: {
          baneado_en: string
          baneado_por: string | null
          grupo_id: string
          usuario_id: string
        }
        Insert: {
          baneado_en?: string
          baneado_por?: string | null
          grupo_id: string
          usuario_id: string
        }
        Update: {
          baneado_en?: string
          baneado_por?: string | null
          grupo_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblParticipantesBaneados_baneado_por_fkey"
            columns: ["baneado_por"]
            isOneToOne: false
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblParticipantesBaneados_baneado_por_fkey"
            columns: ["baneado_por"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tblParticipantesBaneados_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "tblGrupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblParticipantesBaneados_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblParticipantesBaneados_usuario_id_fkey"
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
      tblSesionesActivas: {
        Row: {
          conectado_en: string
          dispositivo: string
          seccion: string
          ultima_actividad: string
          usuario_id: string
          visible: boolean
        }
        Insert: {
          conectado_en?: string
          dispositivo?: string
          seccion?: string
          ultima_actividad?: string
          usuario_id: string
          visible?: boolean
        }
        Update: {
          conectado_en?: string
          dispositivo?: string
          seccion?: string
          ultima_actividad?: string
          usuario_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tblSesionesActivas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblSesionesActivas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tblPushRecordatorios: {
        Row: {
          enviado_en: string
          partido_id: string
          usuario_id: string
        }
        Insert: {
          enviado_en?: string
          partido_id: string
          usuario_id: string
        }
        Update: {
          enviado_en?: string
          partido_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblPushRecordatorios_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "tblPartidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblPushRecordatorios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblPushRecordatorios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tblPushSuscripciones: {
        Row: {
          auth: string
          creado_en: string
          endpoint: string
          id: string
          p256dh: string
          usado_en: string | null
          user_agent: string | null
          usuario_id: string
        }
        Insert: {
          auth: string
          creado_en?: string
          endpoint: string
          id?: string
          p256dh: string
          usado_en?: string | null
          user_agent?: string | null
          usuario_id: string
        }
        Update: {
          auth?: string
          creado_en?: string
          endpoint?: string
          id?: string
          p256dh?: string
          usado_en?: string | null
          user_agent?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblPushSuscripciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "tblProfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tblPushSuscripciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vwPrediccionesGrupoPartido"
            referencedColumns: ["usuario_id"]
          },
        ]
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
      tblTercerLugarAsignacion: {
        Row: {
          combinacion_grupos: string
          slot_74: string
          slot_77: string
          slot_79: string
          slot_80: string
          slot_81: string
          slot_82: string
          slot_85: string
          slot_87: string
        }
        Insert: {
          combinacion_grupos: string
          slot_74: string
          slot_77: string
          slot_79: string
          slot_80: string
          slot_81: string
          slot_82: string
          slot_85: string
          slot_87: string
        }
        Update: {
          combinacion_grupos?: string
          slot_74?: string
          slot_77?: string
          slot_79?: string
          slot_80?: string
          slot_81?: string
          slot_82?: string
          slot_85?: string
          slot_87?: string
        }
        Relationships: []
      }
      tblTercerosClasificados: {
        Row: {
          asignado_por: string | null
          creado_en: string
          grupo: string
          torneo_id: string
        }
        Insert: {
          asignado_por?: string | null
          creado_en?: string
          grupo: string
          torneo_id: string
        }
        Update: {
          asignado_por?: string | null
          creado_en?: string
          grupo?: string
          torneo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tblTercerosClasificados_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "tblTorneos"
            referencedColumns: ["id"]
          },
        ]
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
          puntos_iniciales: number | null
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
      actualizar_puntos_iniciales: {
        Args: { p_participante_id: string; p_puntos: number }
        Returns: undefined
      }
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
      clasificacion_terceros: {
        Args: { p_torneo_id: string }
        Returns: {
          a_favor: number
          ambiguo_corte: boolean
          dif: number
          equipo_id: string
          grupo: string
          posicion: number
          pts: number
        }[]
      }
      crear_grupo: {
        Args: {
          p_descripcion: string
          p_nombre: string
          p_partido_ids: string[]
          p_reglas: Json
          p_torneo_id: string
        }
        Returns: string
      }
      crear_notificacion: {
        Args: {
          p_accion_label: string
          p_audiencia_tipo: string
          p_cuerpo: string
          p_grupo_id: string
          p_imagen_url: string
          p_titulo: string
          p_url: string
          p_usuario_id: string
        }
        Returns: string
      }
      desbanear_participante: {
        Args: { p_grupo_id: string; p_usuario_id: string }
        Returns: undefined
      }
      eliminar_abono: { Args: { p_abono_id: string }; Returns: undefined }
      eliminar_grupo: { Args: { p_grupo_id: string }; Returns: undefined }
      equipo_clasificado: {
        Args: { p_grupo: string; p_pos: number; p_torneo_id: string }
        Returns: string
      }
      equipo_tercero_slot: {
        Args: { p_numero: number; p_torneo_id: string }
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
      gestionar_participante: {
        Args: { p_banear: boolean; p_participante_id: string }
        Returns: undefined
      }
      grupo_detalle: { Args: { p_grupo_id: string }; Returns: Json }
      unirse_grupo: { Args: { p_grupo_id: string }; Returns: undefined }
      inicio_extras: { Args: { p_desde: string }; Returns: Json }
      listar_abonos: {
        Args: { p_participante_id: string }
        Returns: {
          creado_en: string
          id: string
          monto: number
          nota: string
          registrado_por_nombre: string
        }[]
      }
      listar_baneados: {
        Args: { p_grupo_id: string }
        Returns: {
          avatar_url: string
          baneado_en: string
          email: string
          nombre_completo: string
          usuario_id: string
        }[]
      }
      marcar_notificaciones_leidas: {
        Args: { p_ids?: string[] }
        Returns: undefined
      }
      mejores_terceros: {
        Args: { p_torneo_id: string }
        Returns: {
          grupo: string
        }[]
      }
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
      mis_notificaciones: { Args: { p_limite?: number }; Returns: Json }
      pagos_grupo: {
        Args: { p_grupo_id: string }
        Returns: {
          participante_id: string
          total_abonado: number
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
      recordatorios_pendientes: {
        Args: never
        Returns: {
          cierre: string
          equipo_local: string
          equipo_visitante: string
          partido_id: string
          usuario_id: string
        }[]
      }
      registrar_abono: {
        Args: { p_monto: number; p_nota: string; p_participante_id: string }
        Returns: string
      }
      resolver_cruces: { Args: { p_torneo_id: string }; Returns: undefined }
      resolver_placeholder: {
        Args: { p_ph: string; p_torneo_id: string }
        Returns: string
      }
      revertir_partido: { Args: { p_partido_id: string }; Returns: undefined }
      superadmin_buscar_usuarios: {
        Args: { p_q: string }
        Returns: {
          email: string
          id: string
          nombre: string
        }[]
      }
      superadmin_listar_pollas: { Args: never; Returns: Json }
      terceros_admin: {
        Args: { p_torneo_id: string }
        Returns: {
          a_favor: number
          ambiguo_corte: boolean
          clasifica_auto: boolean
          codigo_iso: string
          determinado: boolean
          dif: number
          equipo_id: string
          grupo: string
          hay_manual: boolean
          manual_clasifica: boolean
          nombre: string
          posicion_auto: number
          pts: number
        }[]
      }
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
