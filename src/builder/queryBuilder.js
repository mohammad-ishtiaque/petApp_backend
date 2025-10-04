class QueryBuilder {
    constructor(modelQuery, query) {
      this.modelQuery = modelQuery;
      this.query = query;
    }
  
    search(searchableFields) {
      const searchTerm = this.query?.searchTerm;
      if (searchTerm && searchableFields?.length > 0) {
        const searchConditions = searchableFields.map((field) => {
          const condition = {};
          condition[field] = { $regex: searchTerm, $options: "i" };
          return condition;
        });
  
        this.modelQuery = this.modelQuery
          .find({ $or: searchConditions })
          .collation({ locale: "en", strength: 2 });
      }
      return this;
    }
  
    filter() {
      const queryObj = { ...this.query };
  
      // Exclude special fields
      const excludeFields = ["searchTerm", "sort", "limit", "page", "fields", "from", "to"];
      excludeFields.forEach((el) => delete queryObj[el]);
  
      const filterConditions = [];
  
      // Date range filter
      if (this.query.from && this.query.to) {
        filterConditions.push({
          dateOfService: {
            $gte: new Date(this.query.from),
            $lte: new Date(this.query.to),
          },
        });
      }
  
      // Add any other filters (like cost, area, isFavorite, etc.)
      if (Object.keys(queryObj).length > 0) {
        filterConditions.push(queryObj);
      }
  
      if (filterConditions.length > 0) {
        this.modelQuery = this.modelQuery.find({ $and: filterConditions });
      }
  
      return this;
    }
  
    sort() {
      const sort = (this.query?.sort || "").split(",").join(" ") || "-createdAt";
      this.modelQuery = this.modelQuery.sort(sort);
      return this;
    }
  
    paginate() {
      const page = Number(this.query?.page) || 1;
      const limit = Number(this.query?.limit) || 10;
      const skip = (page - 1) * limit;
  
      this.modelQuery = this.modelQuery.skip(skip).limit(limit);
      return this;
    }
  
    fields() {
      const fields = (this.query?.fields || "").split(",").join(" ") || "-__v";
      this.modelQuery = this.modelQuery.select(fields);
      return this;
    }
  
    async countTotal() {
      const totalQueries = this.modelQuery.getFilter();
      const total = await this.modelQuery.model.countDocuments(totalQueries);
      const page = Number(this.query?.page) || 1;
      const limit = Number(this.query?.limit) || 10;
      const totalPage = Math.ceil(total / limit);
  
      return { page, limit, total, totalPage };
    }
  }
  
  module.exports = QueryBuilder;