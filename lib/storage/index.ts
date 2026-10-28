// Armazenamento privado compatível com S3 (AWS S3, MinIO, Azure via gateway…).
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;
const s3 = () =>
  (client ??= new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY ?? "", secretAccessKey: process.env.S3_SECRET_KEY ?? "" },
  }));
const bucket = () => process.env.S3_BUCKET ?? "ecossistema-privado";

const SIGNATURES: [string, number[]][] = [
  ["application/pdf", [0x25, 0x50, 0x44, 0x46]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46]],
];
const ZIP = [0x50, 0x4b, 0x03, 0x04]; // pptx e docx são zip
const OLE = [0xd0, 0xcf, 0x11, 0xe0]; // ppt antigo

/** Tipo verificado pelos primeiros bytes (não confia na extensão nem no tipo enviado). */
export function sniffMime(bytes: Uint8Array, declared: string): string | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  for (const [mime, sig] of SIGNATURES) if (starts(sig)) return mime;
  if (starts(ZIP) && (declared.includes("presentationml") || declared.includes("wordprocessingml"))) return declared;
  if (starts(OLE) && declared === "application/vnd.ms-powerpoint") return declared;
  return null;
}

export async function putPrivateObject(bytes: Uint8Array, mime: string, ownerId: string) {
  const key = `anexos/${ownerId}/${crypto.randomUUID()}`;
  await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: bytes, ContentType: mime, ServerSideEncryption: process.env.S3_ENDPOINT ? undefined : "AES256" }));
  return key;
}

export async function signedDownloadUrl(key: string, seconds: number) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: seconds });
}
