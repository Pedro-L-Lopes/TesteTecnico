import { db } from "../config/db.js";
import multer from "multer";
import { Readable } from "stream";
import readLine from "readline";
import { json } from "express";

const multerConfig = multer();

const changePrice = (req, res) => {
  multerConfig.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(400).send("Erro no upload do arquivo: " + err.message);
    }

    const buffer = req.file ? req.file.buffer : null;

    if (!buffer) {
      return res
        .status(400)
        .send("Arquivo não encontrado no objeto de resposta.");
    }

    console.log(buffer.toString("utf-8"));

    const readableFile = new Readable();
    readableFile.push(buffer);
    readableFile.push(null);

    const productsLine = readLine.createInterface({
      input: readableFile,
    });

    const products = [];

    for await (let line of productsLine) {
      const productLineSplit = line.split(",");

      // Verifique se há pelo menos dois valores na linha
      if (productLineSplit.length >= 2) {
        const product_code = parseInt(productLineSplit[0], 10);
        const new_price = parseFloat(productLineSplit[1]);

        // Verifique se ambos os valores são números válidos
        if (!isNaN(product_code) && !isNaN(new_price)) {
          products.push({
            product_code: product_code,
            new_price: new_price,
          });
        } else {
          console.error(`Valores inválidos na linha: ${line}`);
        }
      } else {
        console.error(`Linha inválida: ${line}`);
      }
    }

    // Crie um array de promessas para atualizar o preço de produtos existentes ou retornar um erro se não existirem
    const updatePromises = products.map(({ product_code, new_price }) => {
      return new Promise((resolve, reject) => {
        // Verifique se o produto com o código fornecido existe no banco de dados
        db.query(
          "SELECT * FROM products WHERE code = ?",
          [product_code],
          (err, rows) => {
            if (err) {
              reject(err); 
            } else {
              if (rows.length > 0) {
                const product = rows[0];
                // Verifique se o novo preço é maior ou igual ao preço de custo
                if (new_price >= product.cost_price) {
                  // Atualize o preço do produto existente
                  db.query(
                    "UPDATE products SET sales_price = ? WHERE code = ?",
                    [new_price, product_code],
                    (err) => {
                      if (err) {
                        reject(err);
                      } else {
                        resolve();
                      }
                    }
                  );
                } else {
                  // Novo preço menor que o preço de custo, retorne um erro
                  return res
                    .status(400)
                    .send(
                      `Preço inferior ao custo para o produto com código ${product_code}.`
                    );
                }
              } else {
                // Produto não encontrado, retorne um erro
                reject(`Produto com código ${product_code} não encontrado.`);
              }
            }
          }
        );
      });
    });

    // Execute todas as atualizações em paralelo
    try {
      await Promise.all(updatePromises);
      return res.status(200).json("Preços atualizados com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar preços:", error);
      return res.status(500).send("Erro ao atualizar preços.");
    }
  });
};

const getProducts = (req, res) => {
  const q = "SELECT * FROM products";

  db.query(q, (err, data) => {
    if (err) return res.json(err);

    return res.status(200).json(data);
  });
};

const getPacks = (req, res) => {
  const q = "SELECT * FROM packs";

  db.query(q, (err, data) => {
    if (err) return res.json(err);

    return res.status(200).json(data);
  });
};

export { changePrice, getProducts, getPacks };
