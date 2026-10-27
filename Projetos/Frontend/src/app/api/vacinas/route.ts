import { NextResponse } from "next/server";

const apiUrl = process.env.API_URL || "http://localhost:3010";

async function encaminhar(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Erro ao acessar a API de vacinas:", error);

    return NextResponse.json(
      { error: "Não foi possível conectar ao servidor de vacinas." },
      { status: 502 },
    );
  }
}

export async function GET() {
  return encaminhar(`${apiUrl}/vacinas`);
}

export async function POST(request: Request) {
  return encaminhar(`${apiUrl}/addvacina`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: await request.text(),
  });
}

export async function PUT(request: Request) {
  let vacina: { id?: number };

  try {
    vacina = await request.json();
  } catch {
    return NextResponse.json(
      { error: "O corpo da requisição não contém um JSON válido." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(vacina.id) || Number(vacina.id) <= 0) {
    return NextResponse.json(
      { error: "Informe um lote de vacina válido para editar." },
      { status: 400 },
    );
  }

  return encaminhar(`${apiUrl}/vacinas/${vacina.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(vacina),
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");

  if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
    return NextResponse.json(
      { error: "Informe um lote de vacina válido para excluir." },
      { status: 400 },
    );
  }

  return encaminhar(`${apiUrl}/vacinas/${Number(id)}`, {
    method: "DELETE",
  });
}
