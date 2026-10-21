//https://expressjs.com/
//https://nodemon.io/
//https://expressjs.com/en/resources/middleware/cors/
//https://www.npmjs.com/package/mssql

//npm install mssql msnodesqlv8


const express = require('express');
const cors = require('cors');
let app = express();
app.use(express.json());// antigamenete era o body-parser precisa ser instalado, mas agora já vem junto com o express
let port = 3010;

// ====== INSTALAR MULTER https://www.npmjs.com/package/multer
//=== npm install multer

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { sql, conectar } = require('./database.js');
// const { MAX } = require('mssql');
// const { decapsulate } = require('crypto');

app.use(cors());

//===========Multer CONFIGURAR O DIRETORIO ===============

const pastaUploads = path.join(__dirname, "./img");

app.use("/img", express.static(pastaUploads));

if (!fs.existsSync(pastaUploads)) {
    fs.mkdirSync(pastaUploads, { recursive: true });
}

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, pastaUploads);
    },

    filename: function (req, file, cb) {

        const extensao = path.extname(file.originalname);

        const nomeArquivo =
            `${Date.now()}-${Math.round(Math.random() * 1E9)}${extensao}`;

        cb(null, nomeArquivo);
    }
});

const upload = multer({
    storage: storage
});


app.use("/img", express.static(pastaUploads));

//=======================================


//========== LER A QUANTIDADE DE REGISTRO  ANIMAIS ============
app.get('/qtd', async (req, resp) => {
    try {
        // FAZER  A CONTAGEM DE REGISTRO
        const cn = await conectar();
        const qtd = await cn.request().query("SELECT COUNT(*) as total FROM ANIMAL");
        resp.json({ "qtd": qtd.recordset[0].total });
    }
    catch (error) {
        resp.json({ "tipo de erro ": error })
   }
})



//========== LER A LISTA DE VACINAS ===========================
 app.get('/vacinas', async (req, resp) => {
    try {
        // FAZER  A CONTAGEM DE REGISTRO
        const cn = await conectar();
        const resultado= await cn.request().query("SELECT *  FROM VACINA");
        resp.json( resultado.recordset);
    }
    catch (error) {
        resp.json({ "tipo de erro ": error })
    }


})


 app.get('/qtdvacinas', async (req, resp) => {
    try {
        // FAZER  A CONTAGEM DE REGISTRO
        const cn = await conectar();
        const resultado= await cn.request().query("SELECT COUNT(*) AS TOTAL  FROM VACINA");
        resp.json({"qtd": resultado.recordset[0].TOTAL});
    }
    catch (error) {
        resp.json({ "tipo de erro ": error })
    }


})

//===================================================================



//==== MONTAR A  TABELA DE LISTA DE ANIMAL ===============
app.get("/animais", async (req, resp) => {
    try {
        // FAZER  A CONTAGEM DE REGISTRO
        const cn = await conectar();
        const querySql = `SELECT 
                                    animal.id_animal, 
                                    animal.nome, 
                                    animal.rg, 
                                    animal.especie, 
                                    animal.porte,  
                                    animal.raca, 
                                    animal.idade,  
                                    CASE animal.sexo
                                        WHEN 'M' THEN 'macho'
                                        WHEN 'F' THEN 'femea'
                                        ELSE animal.sexo
                                    END AS sexo,
                                    animal.status,  
                                    foto.url_foto,
                                    foto.principal
                          from ANIMAL inner join foto
                          on ANIMAL.id_animal = foto.id_animal
                             where foto.principal = 1
                             ORDER BY  animal.id_animal DESC`;

        const campos = await cn.request().query(querySql);
        resp.json(campos.recordset);
    }
    catch (error) {
        resp.json({ "tipo de erro ": error })
    }
})

app.get('/', async (req, res) => {
    // fazer diretamente a conexão com o banco de dados
    const cn = await conectar();
    // fazer o query para testar a conexão com o banco de dados
    const result = await cn.request().query("SELECT * FROM ANIMAL");
    //res.send('Conexão com o banco de dados realizada com sucesso!');    
    res.json(result.recordset);
    //res.send('Hsadasl');
});

//========== CADASTRO DE ANIMAIS ========================
// INSERT
app.post("/INSERT", upload.array("fotos", 3), async (req, res) => {
    try {
    const {
        id,
        nome,
        rg,
        tipo,
        porte,
        raca,
        idade,
        sexo,
        status,
        fotos,
        fotoPrincipal

    } = req.body;

    if (typeof idade !== "string" || idade.length > 50) {
        return res.status(400).json({
            error: "Informe uma idade com no máximo 50 caracteres."
        });
    }

    const sexoBanco = sexo === "macho" ? "M" : sexo === "femea" ? "F" : null;
    if (sexoBanco === null) {
        return res.status(400).json({ error: "Selecione um sexo válido." });
    }

    // está pegando os dados do corpo da requisição
    console.log("=================================");
    console.log("FOTO PRINCIPAL RECEBIDA:");
    console.log(fotoPrincipal);
    console.log("TIPO:");
    console.log(typeof fotoPrincipal);
    console.log("FOTOS RECEBIDAS:");
    console.log(req.files);
    console.log("=================================");
    const cn = await conectar();


    // conectando com o banco de dados
    // Executar INSERT
    const result = await cn
        .request()
        .input('nome', sql.VarChar(100), nome)
        .input('rg', sql.VarChar(100), rg)
        .input('tipo', sql.VarChar(100), tipo)
        .input('porte', sql.VarChar(100), porte)
        .input('raca', sql.VarChar(100), raca)
        .input('idade', sql.VarChar(50), idade)
        .input('sexo', sql.Char(1), sexoBanco)
        .input('status', sql.VarChar(100), status)
        .query(`
                INSERT INTO ANIMAL
            (
                nome,
                rg,
                especie,
                porte,
                raca,
                idade,
                sexo,
                status
            )
                OUTPUT INSERTED.*
            VALUES
                (
                    @nome,
                    @rg,
                    @tipo,
                    @porte,
                    @raca,
                    @idade,
                    @sexo,
                    @status
                )
                `);


    // Pegar o ID DO ANIMAL E COLOCAR  NA TABELA FOTO
    // ==========================================

    const idAnimal = result.recordset[0].id_animal;
    // 3 - CADASTRAR AS FOTOS
    // ==========================================

    if (req.files && req.files.length > 0) {

        for (let i = 0; i < req.files.length; i++) {
            const foto = req.files[i];
            // Caminho que será salvo no banco
            const caminhoFoto = `/img/${foto.filename}`;
            console.log("Foto:", caminhoFoto);
            await cn
                .request()
                .input("id_animal", sql.Int, idAnimal)
                .input("url_foto", sql.VarChar(255), caminhoFoto)
                .input("principal", sql.Bit, i === Number(fotoPrincipal)
                )
                .query(`
                        INSERT INTO FOTO
            (
                id_animal,
                url_foto,
                principal,
                data_cadastro
            )
        VALUES
            (
                @id_animal,
                @url_foto,
                @principal,
                GETDATE()
            )
            `);
        }
    }


    res.status(201).json({
        mensagem: 'Usuário cadastrado com sucesso!',
        usuario: result.recordset[0]
        //foto: foto.recordset[0]

    });
    } catch (error) {
        console.error("Erro ao cadastrar animal:", error);
        res.status(500).json({
            error: "Não foi possível cadastrar o animal.",
            detalhe: error instanceof Error ? error.message : String(error)
        });
    }
});

//========== CADASTRO DE VACINAS ========================
app.post("/addvacina", async (req, res) => {
    const {
        nome,
        descricao,
        tipo,
        especie,
        fabricante,
        lote,
        dataFabricacao
    } = req.body;

    // A tela pode enviar esses campos com nomes diferentes.
    const dataValidade = req.body.dataValidade ?? req.body.validade;
    const quantidade = Number(
        req.body.quantidadeRecebida ?? req.body.quantidade
    );

    if (
        !nome ||
        !tipo ||
        !especie ||
        !fabricante ||
        !lote ||
        !dataValidade ||
        !Number.isInteger(quantidade) ||
        quantidade <= 0
    ) {
        return res.status(400).json({
            erro: "Preencha os dados obrigatórios e informe uma quantidade inteira positiva."
        });
    }

    let transaction;

    try {
        const pool = await conectar();
        transaction = new sql.Transaction(pool);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

        // Reutiliza a vacina pelo nome ou cadastra uma nova.
        const vacinaExistente = await new sql.Request(transaction)
            .input("nome", sql.VarChar(100), nome)
            .query(`
                SELECT id_vacina
                FROM dbo.VACINA WITH (UPDLOCK, HOLDLOCK)
                WHERE nome = @nome
            `);

        let idVacina;

        if (vacinaExistente.recordset.length > 0) {
            idVacina = vacinaExistente.recordset[0].id_vacina;

            await new sql.Request(transaction)
                .input("idVacina", sql.Int, idVacina)
                .input("descricao", sql.VarChar(255), descricao || null)
                .input("tipo", sql.VarChar(100), tipo)
                .input("especie", sql.VarChar(50), especie)
                .query(`
                    UPDATE dbo.VACINA
                    SET descricao = @descricao,
                        tipo = @tipo,
                        especie = @especie
                    WHERE id_vacina = @idVacina
                `);
        } else {
            const novaVacina = await new sql.Request(transaction)
                .input("nome", sql.VarChar(100), nome)
                .input("descricao", sql.VarChar(255), descricao || null)
                .input("tipo", sql.VarChar(100), tipo)
                .input("especie", sql.VarChar(50), especie)
                .query(`
                    INSERT INTO dbo.VACINA (nome, descricao, tipo, especie)
                    OUTPUT INSERTED.id_vacina
                    VALUES (@nome, @descricao, @tipo, @especie)
                `);

            idVacina = novaVacina.recordset[0].id_vacina;
        }

        // Reutiliza o fabricante pelo nome ou cadastra um novo.
        const fabricanteExistente = await new sql.Request(transaction)
            .input("nome", sql.VarChar(100), fabricante)
            .query(`
                SELECT id_fabricante
                FROM dbo.FABRICANTE WITH (UPDLOCK, HOLDLOCK)
                WHERE nome = @nome
            `);

        let idFabricante;

        if (fabricanteExistente.recordset.length > 0) {
            idFabricante = fabricanteExistente.recordset[0].id_fabricante;
        } else {
            const novoFabricante = await new sql.Request(transaction)
                .input("nome", sql.VarChar(100), fabricante)
                .query(`
                    INSERT INTO dbo.FABRICANTE (nome)
                    OUTPUT INSERTED.id_fabricante
                    VALUES (@nome)
                `);

            idFabricante = novoFabricante.recordset[0].id_fabricante;
        }

        // O estoque inicial do lote começa igual à quantidade recebida.
        const novoLote = await new sql.Request(transaction)
            .input("idVacina", sql.Int, idVacina)
            .input("idFabricante", sql.Int, idFabricante)
            .input("lote", sql.VarChar(30), lote)
            .input("dataFabricacao", sql.Date, dataFabricacao || null)
            .input("dataValidade", sql.Date, dataValidade)
            .input("quantidade", sql.Int, quantidade)
            .query(`
                INSERT INTO dbo.LOTE_VACINA (
                    id_vacina,
                    id_fabricante,
                    numero_lote,
                    data_fabricacao,
                    data_validade,
                    quantidade_total,
                    quantidade_disponivel
                )
                OUTPUT INSERTED.*
                VALUES (
                    @idVacina,
                    @idFabricante,
                    @lote,
                    @dataFabricacao,
                    @dataValidade,
                    @quantidade,
                    @quantidade
                )
            `);

        await transaction.commit();

        return res.status(201).json({
            mensagem: "Vacina e lote cadastrados com sucesso.",
            vacinaId: idVacina,
            lote: novoLote.recordset[0]
        });
    } catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error("Erro ao desfazer transação:", rollbackError);
            }
        }

        console.error("Erro ao cadastrar vacina:", error);

        return res.status(500).json({
            erro: "Não foi possível cadastrar a vacina."
        });
    }
});




// DELETE
app.delete('/usuarios/:id', async (req, res) => {

    try {

        // Pegar o ID da URL
        const id = parseInt(req.params.id);

        // Conectar ao SQL Server
        const cn = await conectar();

        // Executar DELETE
        const result = await cn
            .request()
            .input('id', sql.Int, id)
            .query(`
                DELETE FROM USUARIO
                OUTPUT DELETED.*
            WHERE id_usuario = @id
                `);

        // Verificar se encontrou o usuário
        if (result.recordset.length === 0) {

            return res.status(404).json({
                mensagem: 'Usuário não encontrado'
            });

        }

        // Retornar confirmação
        res.status(200).json({
            mensagem: 'Usuário excluído com sucesso!',
            usuario: result.recordset[0]
        });

    } catch (erro) {

        console.error('Erro:', erro);

        res.status(500).json({
            erro: 'Erro ao excluir usuário',
            detalhe: erro.message
        });

    }

});


// ALTERAR
app.put('/usuarios/:id', async (req, res) => {

    // testa a os dados indo -----------

    // console.log("ID:", req.params.id);
    // console.log("BODY:", req.body);

    // res.json({
    //     id: req.params.id,
    //     dados: req.body
    // });
    //-----------------------------------

    try {

        // Pegar o ID da URL
        const id = parseInt(req.params.id);
        console.log(req.body);
        // Pegar os dados do corpo da requisição
        const {
            nome,
            email,
            telefone,
            senha,
            cpf_cnpj,
            tipo_pessoa,
            data_nasc,
            status } = req.body;



        // //     // Atualizar usuário
        const cn = await conectar();
        const result = await cn
            .request()
            .input('id', sql.Int, id)
            .input('nome', sql.VarChar(100), nome)
            .input('email', sql.VarChar(100), email)
            .input('telefone', sql.VarChar(20), telefone)
            .input('senha', sql.VarChar(255), senha)
            .input('cpf_cnpj', sql.VarChar(18), cpf_cnpj)
            .input('tipo_pessoa', sql.Char(1), tipo_pessoa)
            .input('data_nasc', sql.Date, data_nasc)
            .input('status', sql.Char(1), status)
            .query(`
                UPDATE USUARIO
        SET
        nome = @nome,
            email = @email,
            telefone = @telefone,
            senha = @senha,
            cpf_cnpj = @cpf_cnpj,
            tipo_pessoa = @tipo_pessoa,
            data_nasc = @data_nasc,
            status = @status
                OUTPUT INSERTED.*
            WHERE id_usuario = @id
                `);
        // Verificar se o usuário existe
        if (result.recordset.length === 0) {

            return res.status(404).json({
                mensagem: 'Usuário não encontrado'
            });

        }

        // Retornar usuário atualizado
        res.status(200).json({
            mensagem: 'Usuário atualizado com sucesso!',
            usuario: result.recordset[0]
        });

    } catch (erro) {

        console.error('Erro:', erro);

        res.status(500).json({
            erro: 'Erro ao atualizar usuário',
            detalhe: erro.message
        });

    }

});




app.listen(port, () => {
    console.log(`Servidor http://localhost:${port}`);
}); 