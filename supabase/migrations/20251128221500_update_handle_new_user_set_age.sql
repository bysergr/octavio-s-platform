-- Update handle_new_user to store age from user metadata safely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, age)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    CASE
      WHEN (NEW.raw_user_meta_data ? 'age') THEN
        CASE
          WHEN ((NEW.raw_user_meta_data->>'age')::int BETWEEN 6 AND 9)
            THEN (NEW.raw_user_meta_data->>'age')::int
          ELSE NULL
        END
      ELSE NULL
    END
  );

  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

