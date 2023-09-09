import React, { useState } from "react";

const UpdatePrice = () => {
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [updatedProductsDetails, setUpdatedProductsDetails] = useState([]);
  const [errorMessages, setErrorMessages] = useState([]);

  const clearMessages = () => {
    setSuccessMessage("");
    setErrorMessage("");
    setErrorMessages([]);
  };

  const changeprice = async (event) => {
    event.preventDefault();
    clearMessages();

    const formData = new FormData();
    const fileInput = document.querySelector('input[type="file"]');
    formData.append("file", fileInput.files[0]);

    try {
      const response = await fetch("http://localhost:5000/products", {
        method: "POST",
        body: formData,
      });

      if (response.status === 200) {
        const data = await response.json();
        console.log("Produtos atualizados:", data.updatedProducts);
        setSuccessMessage("Atualização de preços bem-sucedida.");

        const updatedProductsData = data.updatedProducts;
        setUpdatedProductsDetails(updatedProductsData);

        setTimeout(() => {
          setSuccessMessage("");
        }, 5000);
      } else {
        const errorData = await response.json();
        console.error("Erros:", errorData.errors);
        setErrorMessage("Erro ao atualizar preços. Verifique o arquivo.");

        if (errorData.errors && errorData.errors.length > 0) {
          setErrorMessages(errorData.errors);
        } else {
          setErrorMessages(["Erro desconhecido."]);
        }

        setTimeout(() => {
          setErrorMessage("");
          setErrorMessages([]);
        }, 5000);
      }
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
      setErrorMessage("Erro ao se comunicar com o servidor.");

      setTimeout(() => {
        setErrorMessage("");
        setErrorMessages([]);
      }, 5000);
    }
  };

  return (
    <div>
      <form onSubmit={changeprice} className="update-price-form">
        <label className="update-price-label" htmlFor="csv">
          Insira o arquivo
        </label>
        <input className="update-price-label" type="file" name="csv" id="" />
        <input className="update-price-label" type="submit" value="Validar" />
      </form>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      {errorMessage && <div className="error-message">{errorMessage}</div>}

      {errorMessages.length > 0 && (
        <div className="error-messages">
          <ul>
            {errorMessages.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {updatedProductsDetails.length > 0 && (
        <div className="updated-products">
          <h2>Produtos Atualizados:</h2>
          <ul>
            {updatedProductsDetails.map((product, index) => (
              <li key={index} className="product">
                <strong>Código:</strong> {product.code}
                <br />
                <strong>Nome:</strong> {product.name}
                <br />
                <strong>Preço Atual:</strong> R$ {product.currentPrice}
                <br />
                <strong>Novo Preço:</strong> R$ {product.newPrice}
                <br />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UpdatePrice;
