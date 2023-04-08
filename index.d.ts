interface DatabaseEntry {
  /** The unique accessor (id) for the stored data */
  key: string;
  /** The data corresponding with the database entry */
  value: any;
}
