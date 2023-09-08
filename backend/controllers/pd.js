import { db } from "../config/db.js";
import multer from "multer";
import { Readable } from "stream";
import readLine from "readline";

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

    const errorMessages = [];
    let isFirstLine = true; // Flag para identificar a primeira linha

    for await (let line of productsLine) {
      // Remover espaços em branco e caracteres invisíveis antes de verificar se a linha está vazia
      line = line.trim();

      if (isFirstLine) {
        // Pular a primeira linha (cabeçalhos)
        isFirstLine = false;
        continue;
      }

      if (line.length === 0) {
        // Linha vazia, continuar para a próxima linha
        continue;
      }

      const productLineSplit = line.split(",");

      // Verifique se há dois valores na linha
      if (productLineSplit.length === 2) {
        const product_code = parseInt(productLineSplit[0], 10);
        const new_price = parseFloat(productLineSplit[1]);

        // Verifique se ambos os valores são números válidos
        if (!isNaN(product_code) && !isNaN(new_price)) {
          // Verifique se o produto com o código fornecido existe no banco de dados
          try {
            const product = await getProductByCode(product_code);
            const upperLimit = product.sales_price * 1.1;
            const lowerLimit = product.sales_price * 0.9;

            if (new_price >= lowerLimit && new_price <= upperLimit) {
              if (new_price >= product.cost_price) {
                // Atualize o preço do produto existente
                try {
                  await updateProductPrice(product_code, new_price);

                  // Verifique se o produto é um pacote
                  const isPackage = await isProductPackage(product_code);

                  if (isPackage) {
                    // Atualize o preço dos componentes do pacote
                    await updatePackageComponentsPrice(
                      product_code,
                      new_price,
                      errorMessages
                    );
                  }
                } catch (error) {
                  errorMessages.push(
                    `Erro ao atualizar o produto com código ${product_code}`
                  );
                  console.log(error);
                }
              } else {
                errorMessages.push(
                  `Preço de venda inferior ao custo para o produto com código ${product_code}`
                );
              }
            } else {
              errorMessages.push(
                `Reajuste fora do limite de 10% para o produto com código ${product_code}`
              );
            }
          } catch (error) {
            errorMessages.push(
              `Produto com código ${product_code} não encontrado.`
            );
          }
        } else {
          errorMessages.push(`Valores inválidos na linha: ${line}`);
        }
      } else {
        errorMessages.push(`Linha inválida: ${line}`);
      }
    }

    if (errorMessages.length > 0) {
      res.status(400).json({ errors: errorMessages });
    } else {
      res.status(200).json("Preços atualizados com sucesso!");
    }
  });
};

const isProductPackage = (product_code) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM packs WHERE pack_id = ?",
      [product_code],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.length > 0);
        }
      }
    );
  });
};

const updatePackageComponentsPrice = async (
  pack_id,
  new_price,
  errorMessages
) => {
  const components = await getComponentsOfPackage(pack_id);
  if (components.length > 0) {
    // Calcular o preço total dos componentes
    let totalComponentPrice = 0;

    for (const component of components) {
      const component_id = component.product_id;
      const componentProduct = await getProductByCode(component_id);

      if (!isNaN(componentProduct.sales_price)) {
        totalComponentPrice += componentProduct.sales_price;
      } else {
        errorMessages.push(
          `Erro ao obter o preço do componente com código ${component_id}`
        );
      }
    }

    // Calcular a diferença entre o novo preço do pacote e o preço total dos componentes
    const price_difference = new_price - totalComponentPrice;

    // Atualizar os preços dos componentes com base na diferença
    for (const component of components) {
      const component_id = component.product_id;

      try {
        const componentProduct = await getProductByCode(component_id);

        // Calcular o novo preço do componente proporcionalmente
        const componentNewPrice =
          componentProduct.sales_price +
          (componentProduct.sales_price / totalComponentPrice) *
            price_difference;

        // Verificar se o novo preço não é inferior ao custo do componente
        if (componentNewPrice < componentProduct.cost_price) {
          errorMessages.push(
            `Preço de venda inferior ao custo para o componente com código ${component_id}`
          );
        }

        // Atualize o preço do produto componente
        await updateProductPrice(component_id, componentNewPrice);
      } catch (error) {
        errorMessages.push(
          `Erro ao atualizar o preço do componente com código ${component_id}`
        );
      }
    }

    // Atualize o preço do pacote com o novo preço
    await updateProductPrice(pack_id, new_price);
  }
};

const getComponentsOfPackage = (pack_id) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM packs WHERE pack_id = ?",
      [pack_id],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};

const getProductByCode = (product_code) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM products WHERE code = ?",
      [product_code],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          if (rows.length > 0) {
            resolve(rows[0]);
          } else {
            reject(`Produto com código ${product_code} não encontrado.`);
          }
        }
      }
    );
  });
};

const updateProductPrice = (product_code, new_price) => {
  return new Promise((resolve, reject) => {
    // Atualize o preço do produto existente
    db.query(
      "UPDATE products SET sales_price = ? WHERE code = ?",
      [new_price, product_code],
      (err) => {
        if (err) {
          reject(err);
          console.log("TESTE: " + new_price + product_code);
        } else {
          // Sucesso na atualização
          resolve();
          console.log("TESTE: " + new_price + product_code);
        }
      }
    );
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
