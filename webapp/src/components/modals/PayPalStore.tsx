import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';

interface PayPalStoreProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (xpAmount: number) => void;
}

export const PayPalStore = ({ isOpen, onClose, onSuccess }: PayPalStoreProps) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const paypalOptions = {
    clientId: "AWhGEvR7eqIk8FKJ_cr3OKDQy6oGHnTX0hh8DpyjQvZda66ciws-WR9tS5jnA_9FdpNY6zVj9bXKfaih",
    currency: "EUR",
    intent: "capture",
    };

  return ReactDOM.createPortal(
    <div className="modal-backdrop payment-overlay" onClick={onClose}>
      <div className="payment-card" onClick={(e) => e.stopPropagation()}>
        <button className="payment-close" onClick={onClose}>&times;</button>
        
        <h2 className="payment-title">{t('store.title')}</h2>
        <p className="payment-subtitle">{t('store.subtitle')}</p>

        <div className="payment-item-detail">
          <span>{t('store.pack_label')}</span>
        </div>

        <div className="paypal-button-container">
          <PayPalScriptProvider options={paypalOptions}>
            <PayPalButtons
              style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
              createOrder={(_data, actions) => {
                return actions.order.create({
                  intent: "CAPTURE",
                  purchase_units: [
                    {
                      description:  t('store.order_description'),
                      amount: {
                        currency_code: "EUR",
                        value: "1.00",
                      },
                    },
                  ],
                });
              }}
              onApprove={async (_data, actions) => {
                return actions.order?.capture().then((details) => {
                  const payerName = details.payer?.name?.given_name ?? "Usuario";
                  console.log("Pago exitoso de:", payerName);
                  onSuccess(1000);
                  onClose();
                });
              }}
              onError={(err) => {
                console.error("Error en PayPal:", err);
                alert(t('store.error'));
              }}
            />
          </PayPalScriptProvider>
        </div>
        <p className="payment-footer">{t('store.footer')}</p>
      </div>
    </div>,
    document.body
  );
};