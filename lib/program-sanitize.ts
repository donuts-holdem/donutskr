import sanitizeHtml from "sanitize-html";

/**
 * Shared sanitize-html options for program descriptions.
 * Used by the public program detail page, the ProgramBlocks renderer,
 * and the admin edit-page legacy-preview.
 */
export const PROGRAM_SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};
