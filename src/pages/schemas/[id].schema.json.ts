import type { APIRoute, GetStaticPaths } from "astro";

const schemaFiles = import.meta.glob("../../data/schemas/*.schema.json", {
  eager: true,
});

export const getStaticPaths: GetStaticPaths = async () => {
  return Object.keys(schemaFiles).map((key) => {
    const id = key.split("/").pop()?.replace(".schema.json", "") || "";
    return {
      params: { id },
      props: { schema: (schemaFiles[key] as any).default },
    };
  });
};

export const GET: APIRoute = async ({ props }) => {
  return new Response(JSON.stringify(props.schema, null, 2), {
    headers: {
      "Content-Type": "application/schema+json",
    },
  });
};
