/**
 * Generated-style Supabase types for the public schema.
 *
 * Source of truth: supabase/migrations/202607150001-007. Regenerate these
 * types with the Supabase CLI after applying migrations to a linked project.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      cooking_history: {
        Row: {
          cooked_at: string;
          created_at: string;
          id: string;
          notes: string | null;
          recipe_id: string;
          servings: number | null;
          user_id: string;
        };
        Insert: {
          cooked_at?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          recipe_id: string;
          servings?: number | null;
          user_id?: string;
        };
        Update: {
          cooked_at?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          recipe_id?: string;
          servings?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cooking_history_recipe_fk";
            columns: ["user_id", "recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      ingredient_substitutions: {
        Row: {
          created_at: string;
          id: string;
          ingredient_id: string;
          notes: string | null;
          quantity_multiplier: number;
          safety_warning: string | null;
          source_unit: string | null;
          substitute_ingredient_id: string;
          substitute_unit: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ingredient_id: string;
          notes?: string | null;
          quantity_multiplier?: number;
          safety_warning?: string | null;
          source_unit?: string | null;
          substitute_ingredient_id: string;
          substitute_unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ingredient_id?: string;
          notes?: string | null;
          quantity_multiplier?: number;
          safety_warning?: string | null;
          source_unit?: string | null;
          substitute_ingredient_id?: string;
          substitute_unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ingredient_substitutions_source_fk";
            columns: ["user_id", "ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "ingredient_substitutions_target_fk";
            columns: ["user_id", "substitute_ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      ingredients: {
        Row: {
          aliases: string[];
          canonical_name: string;
          category: Database["public"]["Enums"]["ingredient_category"];
          created_at: string;
          default_unit: string | null;
          display_name: string | null;
          id: string;
          is_staple: boolean;
          normalized_name: string;
          notes: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          aliases?: string[];
          canonical_name: string;
          category?: Database["public"]["Enums"]["ingredient_category"];
          created_at?: string;
          default_unit?: string | null;
          display_name?: string | null;
          id?: string;
          is_staple?: boolean;
          normalized_name: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          aliases?: string[];
          canonical_name?: string;
          category?: Database["public"]["Enums"]["ingredient_category"];
          created_at?: string;
          default_unit?: string | null;
          display_name?: string | null;
          id?: string;
          is_staple?: boolean;
          normalized_name?: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      pantry_items: {
        Row: {
          created_at: string;
          depleted_at: string | null;
          expiration_date: string | null;
          id: string;
          ingredient_id: string;
          is_depleted: boolean;
          low_stock: boolean;
          notes: string | null;
          quantity: number | null;
          storage_location: Database["public"]["Enums"]["storage_location"];
          unit: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          depleted_at?: string | null;
          expiration_date?: string | null;
          id?: string;
          ingredient_id: string;
          is_depleted?: boolean;
          low_stock?: boolean;
          notes?: string | null;
          quantity?: number | null;
          storage_location?: Database["public"]["Enums"]["storage_location"];
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          depleted_at?: string | null;
          expiration_date?: string | null;
          id?: string;
          ingredient_id?: string;
          is_depleted?: boolean;
          low_stock?: boolean;
          notes?: string | null;
          quantity?: number | null;
          storage_location?: Database["public"]["Enums"]["storage_location"];
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pantry_items_ingredient_fk";
            columns: ["user_id", "ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email: string;
          id: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      recipe_images: {
        Row: {
          alt_text: string | null;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["image_kind"];
          recipe_id: string;
          sort_order: number;
          storage_path: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["image_kind"];
          recipe_id: string;
          sort_order?: number;
          storage_path: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["image_kind"];
          recipe_id?: string;
          sort_order?: number;
          storage_path?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_images_recipe_fk";
            columns: ["user_id", "recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      recipe_ingredients: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          ingredient_id: string;
          is_garnish: boolean;
          is_optional: boolean;
          preparation_note: string | null;
          quantity: number | null;
          recipe_id: string;
          section_name: string | null;
          sort_order: number;
          unit: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          ingredient_id: string;
          is_garnish?: boolean;
          is_optional?: boolean;
          preparation_note?: string | null;
          quantity?: number | null;
          recipe_id: string;
          section_name?: string | null;
          sort_order?: number;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          ingredient_id?: string;
          is_garnish?: boolean;
          is_optional?: boolean;
          preparation_note?: string | null;
          quantity?: number | null;
          recipe_id?: string;
          section_name?: string | null;
          sort_order?: number;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_fk";
            columns: ["user_id", "ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_fk";
            columns: ["user_id", "recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      recipe_shares: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          id: string;
          permission: Database["public"]["Enums"]["share_permission"];
          recipe_id: string;
          shared_with_email: string | null;
          shared_with_user_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          id?: string;
          permission?: Database["public"]["Enums"]["share_permission"];
          recipe_id: string;
          shared_with_email?: string | null;
          shared_with_user_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          id?: string;
          permission?: Database["public"]["Enums"]["share_permission"];
          recipe_id?: string;
          shared_with_email?: string | null;
          shared_with_user_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_shares_recipe_fk";
            columns: ["user_id", "recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      recipe_steps: {
        Row: {
          created_at: string;
          id: string;
          image_path: string | null;
          instruction: string;
          recipe_id: string;
          sort_order: number;
          timer_seconds: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_path?: string | null;
          instruction: string;
          recipe_id: string;
          sort_order?: number;
          timer_seconds?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_path?: string | null;
          instruction?: string;
          recipe_id?: string;
          sort_order?: number;
          timer_seconds?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_fk";
            columns: ["user_id", "recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      recipe_tags: {
        Row: {
          created_at: string;
          id: string;
          recipe_id: string;
          tag_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          recipe_id: string;
          tag_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          recipe_id?: string;
          tag_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_tags_recipe_fk";
            columns: ["user_id", "recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "recipe_tags_tag_fk";
            columns: ["user_id", "tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      recipes: {
        Row: {
          category: string;
          cook_minutes: number;
          cooked_count: number;
          created_at: string;
          cuisine: string | null;
          description: string | null;
          difficulty: Database["public"]["Enums"]["recipe_difficulty"] | null;
          id: string;
          image_path: string | null;
          is_favorite: boolean;
          last_cooked_at: string | null;
          notes: string | null;
          prep_minutes: number;
          rest_minutes: number;
          revision: number;
          search_document: unknown;
          servings: number;
          slug: string | null;
          source_name: string | null;
          source_url: string | null;
          status: Database["public"]["Enums"]["recipe_status"];
          title: string;
          total_minutes: number;
          updated_at: string;
          user_id: string;
          visibility: Database["public"]["Enums"]["recipe_visibility"];
        };
        Insert: {
          category?: string;
          cook_minutes?: number;
          cooked_count?: number;
          created_at?: string;
          cuisine?: string | null;
          description?: string | null;
          difficulty?: Database["public"]["Enums"]["recipe_difficulty"] | null;
          id?: string;
          image_path?: string | null;
          is_favorite?: boolean;
          last_cooked_at?: string | null;
          notes?: string | null;
          prep_minutes?: number;
          rest_minutes?: number;
          revision?: number;
          search_document?: never;
          servings?: number;
          slug?: string | null;
          source_name?: string | null;
          source_url?: string | null;
          status?: Database["public"]["Enums"]["recipe_status"];
          title: string;
          total_minutes?: never;
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["recipe_visibility"];
        };
        Update: {
          category?: string;
          cook_minutes?: number;
          cooked_count?: number;
          created_at?: string;
          cuisine?: string | null;
          description?: string | null;
          difficulty?: Database["public"]["Enums"]["recipe_difficulty"] | null;
          id?: string;
          image_path?: string | null;
          is_favorite?: boolean;
          last_cooked_at?: string | null;
          notes?: string | null;
          prep_minutes?: number;
          rest_minutes?: number;
          revision?: number;
          search_document?: never;
          servings?: number;
          slug?: string | null;
          source_name?: string | null;
          source_url?: string | null;
          status?: Database["public"]["Enums"]["recipe_status"];
          title?: string;
          total_minutes?: never;
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["recipe_visibility"];
        };
        Relationships: [];
      };
      shopping_list_items: {
        Row: {
          completed_at: string | null;
          created_at: string;
          custom_name: string | null;
          id: string;
          ingredient_id: string | null;
          is_completed: boolean;
          notes: string | null;
          quantity: number | null;
          recipe_id: string | null;
          unit: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          custom_name?: string | null;
          id?: string;
          ingredient_id?: string | null;
          is_completed?: boolean;
          notes?: string | null;
          quantity?: number | null;
          recipe_id?: string | null;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          custom_name?: string | null;
          id?: string;
          ingredient_id?: string | null;
          is_completed?: boolean;
          notes?: string | null;
          quantity?: number | null;
          recipe_id?: string | null;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_ingredient_fk";
            columns: ["user_id", "ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "shopping_list_items_recipe_fk";
            columns: ["user_id", "recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      tags: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          normalized_name: string;
          type: Database["public"]["Enums"]["tag_type"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          normalized_name: string;
          type?: Database["public"]["Enums"]["tag_type"];
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          normalized_name?: string;
          type?: Database["public"]["Enums"]["tag_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          additional_staple_names: string[];
          created_at: string;
          default_servings: number;
          id: string;
          ignore_staples_by_default: boolean;
          measurement_preference: Database["public"]["Enums"]["measurement_preference"];
          reduce_motion: boolean;
          staple_ingredient_ids: string[];
          theme: Database["public"]["Enums"]["theme_preference"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          additional_staple_names?: string[];
          created_at?: string;
          default_servings?: number;
          id?: string;
          ignore_staples_by_default?: boolean;
          measurement_preference?: Database["public"]["Enums"]["measurement_preference"];
          reduce_motion?: boolean;
          staple_ingredient_ids?: string[];
          theme?: Database["public"]["Enums"]["theme_preference"];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          additional_staple_names?: string[];
          created_at?: string;
          default_servings?: number;
          id?: string;
          ignore_staples_by_default?: boolean;
          measurement_preference?: Database["public"]["Enums"]["measurement_preference"];
          reduce_motion?: boolean;
          staple_ingredient_ids?: string[];
          theme?: Database["public"]["Enums"]["theme_preference"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_recipe_ingredients_to_pantry: {
        Args: {
          p_location?: Database["public"]["Enums"]["storage_location"];
          p_recipe_id: string;
        };
        Returns: number;
      };
      add_recipe_missing_to_shopping: {
        Args: {
          p_ingredient_ids?: string[] | null;
          p_recipe_id: string;
        };
        Returns: number;
      };
      bulk_upsert_pantry_items: {
        Args: { p_items: Json };
        Returns: string[];
      };
      create_recipe: {
        Args: { p_recipe: Json };
        Returns: string;
      };
      create_recipe_with_details: {
        Args: {
          p_images?: Json;
          p_ingredients?: Json;
          p_recipe: Json;
          p_steps?: Json;
          p_tags?: Json;
        };
        Returns: string;
      };
      delete_all_cookbook_data: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      delete_recipe_with_images: {
        Args: { p_recipe_id: string };
        Returns: string[];
      };
      duplicate_recipe: {
        Args: { p_recipe_id: string };
        Returns: string;
      };
      export_cookbook_data: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      import_cookbook: {
        Args: { p_mode?: string; p_payload: Json };
        Returns: Json;
      };
      mark_recipe_cooked: {
        Args: {
          p_notes?: string | null;
          p_recipe_id: string;
          p_servings?: number | null;
        };
        Returns: string;
      };
      merge_ingredients: {
        Args: { p_source_id: string; p_target_id: string };
        Returns: Json;
      };
      move_completed_shopping_to_pantry: {
        Args: {
          p_item_ids?: string[] | null;
          p_location?: Database["public"]["Enums"]["storage_location"];
        };
        Returns: Json;
      };
      search_key: {
        Args: { value: string };
        Returns: string;
      };
      search_recipes: {
        Args: {
          p_category?: string | null;
          p_cuisine?: string | null;
          p_dietary_tag?: string | null;
          p_difficulty?:
            Database["public"]["Enums"]["recipe_difficulty"] | null;
          p_favorite?: boolean | null;
          p_limit?: number;
          p_max_prep_minutes?: number | null;
          p_max_total_minutes?: number | null;
          p_offset?: number;
          p_query?: string | null;
          p_sort?: string;
        };
        Returns: {
          category: string;
          cook_minutes: number;
          cooked_count: number;
          created_at: string;
          cuisine: string | null;
          description: string | null;
          difficulty: Database["public"]["Enums"]["recipe_difficulty"] | null;
          id: string;
          image_path: string | null;
          is_favorite: boolean;
          last_cooked_at: string | null;
          prep_minutes: number;
          rest_minutes: number;
          servings: number;
          slug: string | null;
          status: Database["public"]["Enums"]["recipe_status"];
          title: string;
          total_count: number;
          total_minutes: number;
          updated_at: string;
        }[];
      };
      save_user_settings: {
        Args: { p_settings: Json };
        Returns: string;
      };
      update_recipe: {
        Args: { p_recipe: Json; p_recipe_id: string };
        Returns: string;
      };
      update_recipe_with_details: {
        Args: {
          p_images?: Json | null;
          p_ingredients?: Json | null;
          p_recipe: Json;
          p_recipe_id: string;
          p_steps?: Json | null;
          p_tags?: Json | null;
        };
        Returns: string;
      };
      upsert_pantry_item: {
        Args: { p_item: Json };
        Returns: string;
      };
      upsert_shopping_item: {
        Args: { p_item: Json };
        Returns: string;
      };
    };
    Enums: {
      image_kind: "cover" | "gallery";
      ingredient_category:
        | "produce"
        | "meat"
        | "seafood"
        | "dairy"
        | "eggs"
        | "grains"
        | "pasta"
        | "baking"
        | "spices"
        | "herbs"
        | "condiments"
        | "oils"
        | "canned_goods"
        | "frozen"
        | "beverages"
        | "other";
      measurement_preference: "metric" | "imperial" | "original";
      recipe_difficulty: "easy" | "medium" | "challenging";
      recipe_status: "draft" | "published";
      recipe_visibility: "private" | "shared" | "public";
      share_permission: "view" | "edit";
      storage_location: "fridge" | "freezer" | "pantry" | "counter" | "other";
      tag_type: "dietary" | "custom";
      theme_preference: "light" | "dark" | "system";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends (PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      image_kind: ["cover", "gallery"],
      ingredient_category: [
        "produce",
        "meat",
        "seafood",
        "dairy",
        "eggs",
        "grains",
        "pasta",
        "baking",
        "spices",
        "herbs",
        "condiments",
        "oils",
        "canned_goods",
        "frozen",
        "beverages",
        "other",
      ],
      measurement_preference: ["metric", "imperial", "original"],
      recipe_difficulty: ["easy", "medium", "challenging"],
      recipe_status: ["draft", "published"],
      recipe_visibility: ["private", "shared", "public"],
      share_permission: ["view", "edit"],
      storage_location: ["fridge", "freezer", "pantry", "counter", "other"],
      tag_type: ["dietary", "custom"],
      theme_preference: ["light", "dark", "system"],
    },
  },
} as const;
