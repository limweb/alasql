/*
//
// Select compiler part for Alasql.js
// Date: 03.11.2014
// (c) 2014, Andrey Gershun
//
*/

// yy.Select.prototype.compileSources = function(query) {
// 	return sources;
// };

function compileSelectStar (query,alias) {
	// console.log(query.aliases[alias]);
//	console.log(query,alias);
	// console.log(query.aliases[alias].tableid);
//	console.log(42,631,alias);
//	console.log(query.aliases);
	var s = '', sp = '', ss=[];
//	if(!alias) {
//		sp += 'for(var k1 in p) var w=p[k1];for(var k2 in w){r[k2]=w[k2]};';
//	} else 	{
		if(query.aliases[alias].tableid) {
			var columns = alasql.databases[query.aliases[alias].databaseid].tables[query.aliases[alias].tableid].columns;
		};
		// Check if this is a Table or other

		if(columns && columns.length > 0) {
			columns.forEach(function(tcol){
				ss.push('\''+tcol.columnid+'\':p[\''+alias+'\'][\''+tcol.columnid+'\']');
				query.selectColumns[escapeq(tcol.columnid)] = true;

	//		console.log('ok',s);

				var coldef = {
					columnid:tcol.columnid, 
					dbtypeid:tcol.dbtypeid, 
					dbsize:tcol.dbsize, 
					dbprecision:tcol.dbprecision,
					dbenum: tcol.dbenum
				};
				query.columns.push(coldef);
				query.xcolumns[coldef.columnid]=coldef;

			});
//console.log(999,columns);			
		} else {
			// if column not exists, then copy all
			sp += 'var w=p["'+alias+'"];for(var k in w){r[k]=w[k]};';
//console.log(777, sp);
			query.dirtyColumns = true;
		}
//	}
//console.log({s:ss.join(','),sp:sp});
	return {s:ss.join(','),sp:sp};
}


yy.Select.prototype.compileSelect1 = function(query) {
	var self = this;
	query.columns = [];
	query.xcolumns = {};
	query.selectColumns = {};
	query.dirtyColumns = false;
	var s = 'var r={';
	var sp = '';
	var ss = [];

	this.columns.forEach(function(col){
//console.log(col);		
		if(col instanceof yy.Column) {
			if(col.columnid == '*') {
				if(col.func) {
					sp += 'r=params[\''+col.param+'\'](p[\''+query.sources[0].alias+'\'],p,params,alasql);';
				} else if(col.tableid) {
					//Copy all
					var ret = compileSelectStar(query, col.tableid);
					if(ret.s)  ss = ss.concat(ret.s);
					sp += ret.sp;

				} else {
//					console.log('aliases', query.aliases);
					for(var alias in query.aliases) {
						var ret = compileSelectStar(query, alias); //query.aliases[alias].tableid);
						if(ret.s) ss = ss.concat(ret.s);
						sp += ret.sp;
					}
					// TODO Remove these lines
					// In case of no information 
					// sp += 'for(var k1 in p){var w=p[k1];'+
					// 			'for(k2 in w) {r[k2]=w[k2]}}'
				}
			} else {
				// If field, otherwise - expression
				var tbid = col.tableid;
//				console.log(query.sources);
				var dbid = col.databaseid || query.sources[0].databaseid || query.database.databaseid;
				if(!tbid) tbid = query.defcols[col.columnid];
				if(!tbid) tbid = query.defaultTableid;
				if(col.columnid != '_') {
					ss.push('\''+escapeq(col.as || col.columnid)+'\':p[\''+(tbid)+'\'][\''+col.columnid+'\']');
				} else {
					ss.push('\''+escapeq(col.as || col.columnid)+'\':p[\''+(tbid)+'\']');					
				}
				query.selectColumns[escapeq(col.as || col.columnid)] = true;

				if(query.aliases[tbid] && query.aliases[tbid].type == 'table') {

					if(!alasql.databases[dbid].tables[query.aliases[tbid].tableid]) {
//						console.log(query.database,tbid,query.aliases[tbid].tableid);
						throw new Error('Table \''+(tbid)+'\' does not exists in database');
					}
					var columns = alasql.databases[dbid].tables[query.aliases[tbid].tableid].columns;					
					var xcolumns = alasql.databases[dbid].tables[query.aliases[tbid].tableid].xcolumns;
//console.log(xcolumns, col,123);
//					console.log(0);
					if(xcolumns && columns.length > 0) {
//						console.log(1);
						var tcol = xcolumns[col.columnid];
						var coldef = {
							columnid:col.as || col.columnid, 
							dbtypeid:tcol.dbtypeid, 
							dbsize:tcol.dbsize, 
							dbpecision:tcol.dbprecision,
							dbenum: tcol.dbenum,
						};
//						console.log(2);
						query.columns.push(coldef);
						query.xcolumns[coldef.columnid]=coldef;
					} else {
						query.dirtyColumns = true;
					}
				} else {
					// This is a subquery? 
					// throw new Error('There is now such table \''+col.tableid+'\'');
				};

			}
		} else if(col instanceof yy.AggrValue) {
			if(!self.group) {
//				self.group=[new yy.Column({columnid:'q',as:'q'	})];
				self.group = [''];
			}
			if(!col.as) col.as = escapeq(col.toString());
			if (col.aggregatorid == 'SUM' || col.aggregatorid == 'MAX' ||  col.aggregatorid == 'MIN' ||
				col.aggregatorid == 'FIRST' || col.aggregatorid == 'LAST' ||  
				col.aggregatorid == 'AVG' || col.aggregatorid == 'ARRAY' || col.aggregatorid == 'REDUCE'
				) {
				ss.push("'"+escapeq(col.as)+'\':'+col.expression.toJavaScript("p",query.defaultTableid,query.defcols))	
			} else if (col.aggregatorid == 'COUNT') {
				ss.push("'"+escapeq(col.as)+"':1");
				// Nothing
			}
			query.selectColumns[col.aggregatorid+'('+escapeq(col.expression.toString())+')'] = thtd;

//			else if (col.aggregatorid == 'MAX') {
//				ss.push((col.as || col.columnid)+':'+col.toJavaScript("p.",query.defaultTableid))
//			} else if (col.aggregatorid == 'MIN') {
//				ss.push((col.as || col.columnid)+':'+col.toJavaScript("p.",query.defaultTableid))
//			}
		} else {
			ss.push('\''+escapeq(col.as || col.columnid || col.toString())+'\':'+col.toJavaScript("p",query.defaultTableid,query.defcols));
//			ss.push('\''+escapeq(col.toString())+'\':'+col.toJavaScript("p",query.defaultTableid));
			//if(col instanceof yy.Expression) {
			query.selectColumns[escapeq(col.as || col.columnid || col.toString())] = true;
		}
	});
	s += ss.join(',')+'};'+sp;
	return s;
//console.log(42,753,query.xcolumns, query.selectColumns);
}
yy.Select.prototype.compileSelect2 = function(query) {

	var s = query.selectfns;
//	console.log(s);
	return new Function('p,params,alasql',s+'return r');
};


yy.Select.prototype.compileSelectGroup0 = function(query) {
	var self = this;
	self.columns.forEach(function(col,idx){
		if(col instanceof yy.Column && col.columnid == '*') {
		} else {
			var colas;
			//  = col.as;
				if(col instanceof yy.Column) {
					colas = escapeq(col.columnid);
				} else {
					colas = escapeq(col.toString());
				}
				for(var i=0;i<idx;i++) {
					if(colas == self.columns[i].nick) {
						colas = self.columns[i].nick+':'+idx;
						break;
					}
				}
				// }
				col.nick = colas;
//				console.log("colas:",colas);
			// }
		}
	});
	
	this.columns.forEach(function(col){
		if(col.findAggregator) col.findAggregator(query);
	});

	if(this.having) {
		if(this.having.findAggregator) this.having.findAggregator(query);
	}

};

yy.Select.prototype.compileSelectGroup1 = function(query) {
	var self = this;
	var s = 'var r = {};';

	self.columns.forEach(function(col,idx){
//		console.log(col);
		if(col instanceof yy.Column && col.columnid == '*') {
//			s += 'for(var k in g){r[k]=g[k]};';
			s += 'for(var k in this.query.groupColumns){r[k]=g[this.query.groupColumns[k]]};';
//			console.log(query);
		} else {
			// var colas = col.as;
			var colas = col.as;
			if(typeof colas == 'undefined') {
			 	if(col instanceof yy.Column) colas = escapeq(col.columnid);
			 	else colas = col.nick;
			}
			query.groupColumns[colas]=col.nick;

/*			if(typeof colas == 'undefined') {
				if(col instanceof yy.Column) {
					colas = col.columnid;
				} else {
					colas = col.toString();
					for(var i=0;i<idx;i++) {
						if(colas == self.columns[i].as) {
							colas = self.columns[i].as+':'+idx;
							break;
						}
					}
					col.as = colas;
				}
			}
*/
//			if(col.as) {
			s += 'r[\''+colas+'\']=';
			// } else {
			// 	s += 'r[\''+escapeq()+'\']=';
			// };
			// s += ';';
//			console.log(col);//,col.toJavaScript('g',''));


 			s += col.toJavaScript('g','')+';';				
/*
			s += 'g[\''+col.nick+'\'];';

*/
			// if(col instanceof yy.Column) {
			// 	s += 'g[\''+col.columnid+'\'];';
			// } else {
//				s += 'g[\''+col.toString()+'\'];';

//				console.log(col);
				// var kg = col.toJavaScript('g','')+';';				
				// for(var i=0;i<query.removeKeys.length;i++) {
				// 	// THis part should be intellectual
				// 	if(query.removeKeys[i] == colas) {
				// s += 'g[\''+colas+'\'];';
				// 		break;
				// 	}
				// };
				// s += kg;
//				console.log(s);
			// }
//			s += col.toJavaScript('g','')+';';
//console.log(colas,query.removeKeys);
			for(var i=0;i<query.removeKeys.length;i++) {
				// THis part should be intellectual
				if(query.removeKeys[i] == colas) {
					query.removeKeys.splice(i,1);
					break;
				}
			}
		};
	});
	// return new Function('g,params,alasql',s+'return r');
	return s;
}

yy.Select.prototype.compileSelectGroup2 = function(query) {
	var s = query.selectgfns;
//	console.log('selectg:',s);
	return new Function('g,params,alasql',s+'return r');
}

// SELECY * REMOVE [COLUMNS] col-list, LIKE ''
yy.Select.prototype.compileRemoveColumns = function(query) {
	if(typeof this.removecolumns != 'undefined') {
		query.removeKeys = query.removeKeys.concat(
			this.removecolumns.filter(function (column) {
				return (typeof column.like == 'undefined');
			}).map(function(column){return column.columnid}));

//console.log(query.removeKeys,this.removecolumns);				
		query.removeLikeKeys = this.removecolumns.filter(function (column) {
				return (typeof column.like != 'undefined');
			}).map(function(column){
				return new RegExp(column.like.value.replace(/\%/g,'.*'),'g');
			});
	}
}
