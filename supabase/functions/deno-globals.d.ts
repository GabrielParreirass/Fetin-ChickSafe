declare namespace Deno {
  function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
  namespace env {
    function get(key: string): string | undefined;
  }
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}
