export interface Testimonial {
  name: string;
  text: string;
  rating: number;
}

export const testimonials: Testimonial[] = [
  { name: 'Rafa Vilches', text: 'Servicio excelente! Tenía problemas de lentitud en el ordenador y vino el técnico el mismo día y me solucionó rapidísimo el problema y súper profesional, todo perfecto.', rating: 5 },
  { name: 'alba serrano', text: 'Manuel, una persona muy profesional, simpática y rápida me dejo mi movil apunto y cambio de pantalla protectora sin duda repetiré cuando tenga un problema.', rating: 5 },
  { name: 'jorge serrano muñoz', text: 'Manuel una persona muy amable y muy servicial me atendió un sábado para la limpieza de mi ordenador de mesa, quedó nuevo. Volveré a repetir sin duda.', rating: 5 },
  { name: 'Alba Gallego', text: 'Es muy fiable la tienda yo compré un teclado para la tablet y más cosas y todo super bien os lo recomiendo super bien.', rating: 5 },
  { name: 'oscar messi', text: 'Estoy muy contento con la reparación que me hizo en el móvil, es muy formal, responsable y todo excelente.', rating: 5 },
  { name: 'eva ruz agudo', text: 'Servicio excelente, el técnico vino a solucionarnos un problema de latencia baja en el ordenador y lo solucionó totalmente, sin duda nuestro técnico de confianza Manu, todo un profesional y sin duda repetiremos para cualquier problema!!!', rating: 5 },
  { name: 'Fran Gómez', text: '10/10!! al instalar una SSD nueva, no me funcionaban muchísimas cosas y Manu me solucionó el problema en nada además muy buen precio.', rating: 5 },
  { name: 'María EAV', text: 'Si buscas un lugar confiable para comprar o reparar tu móvil, Inforvel es una excelente opción lo recomiendo gran profesional!!', rating: 5 },
  { name: 'JJ Hosteleria', text: 'Compre un Ordenador de la marca medion y Consumibles de mi impresora brother y el envio fue rapido y la atencion del personal muy amable posiblemente de las mejores.', rating: 5 },
  { name: 'Antonio', text: 'Impresionante la capacidad de Manuel para dar soluciones técnico-informaticas. Me solucionó 11 de 10 necesidades de nuestra empresa.', rating: 5 },
  { name: 'Juan Jose Lumbreras Rodriguez', text: 'Una tienda Online de productos de informatica muy recomendable a menudo compro aqui mis consumibles de impresora y todo genial.', rating: 5 },
  { name: 'Antonio Manuel Fernandez Camacho', text: 'Se me rompió la pantalla del teléfono y me atendió muy correctamente y me dejó la pantalla como nueva.', rating: 5 },
  { name: 'Laura Berlanga', text: 'No está mal.', rating: 3 },
  { name: 'Rafael Pascual', text: 'Pone que está abierto 24h y luego de venir andando hasta el local resulta que está cerrado.', rating: 1 },
];

export const testimonialRatingValue = Number(
  (testimonials.reduce((sum, item) => sum + item.rating, 0) / testimonials.length).toFixed(1)
);
