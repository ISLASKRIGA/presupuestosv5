export type Estatus =
  | 'EQUILIBRADO'
  | 'FALTA RECURSO'
  | 'SOBRA RECURSO'
  | 'PENDIENTE VINCULACIÓN SICOP';

export interface ContratoMaestro {
  contrato: string;
  contratoPCOM: string;
  tipoVinculacion: string;
  comprometidoSICOP: number;
  modificadoSICOP: number;
  ejercidoSICOP: number;
  disponibleSICOP: number;
  modificadoINPer: number;
  pagadoINPer: number;
  montoEjercerINPer: number;
  estimacionINPer: number;
  saldo: number;
  estatus: Estatus;
  coberturaPorc: number | null;
  renglonesPCOM: number;
  renglomesINPer: number;
}

export interface ResumenEstatus {
  estatus: Estatus;
  contratos: number;
  disponibleSICOP: number;
  estimacionINPer: number;
  saldo: number;
}

export interface PCOMRow {
  NO_COMPROMISO: number;
  CTOEXT: string;
  COMPROMISO: number;
  MODIFICADO: number;
  EJERCIDO: number;
  DISPONIBLE: number;
  NOMBRE_PROVEEDOR?: string;
  DESCRIPCION_OBJETO_DE_GASTO?: string;
  FECHAI?: string;
  FECHAF?: string;
  [key: string]: unknown;
}

export interface INPerRow {
  'No. de contrato': string;
  Proveedor?: string;
  'Descripción del bien o servicio'?: string;
  'Estimación del monto por ejercer': number;
  'Monto con que fue registrado el compromiso en SICOP'?: number;
  'Monto pagado del contrato'?: number;
  'Monto por ejercer'?: number;
  'Importe autorizado de suficiencia presupuestal'?: number;
  UR?: string;
  PP?: number;
  [key: string]: unknown;
}

export interface ControlValidacion {
  Control: string;
  Valor: number | string;
  Criterio: string;
}

export interface AppData {
  maestra: ContratoMaestro[];
  resumen: ResumenEstatus[];
  pcom: PCOMRow[];
  inper: INPerRow[];
  pendientes: ContratoMaestro[];
  control: ControlValidacion[];
  corte: string;
}
