const _importStatements = exclusiveParse(document, /@/gd, undefined, true).splice(0, 1);
        for (let i = 0; i < _importStatements.length; i++) {
            // filter out irrevelant parts
            const _index = _importStatements[i][0].indexOf("#");
            if (_index > -1) {
                _importStatements[i][0] = _importStatements[i][0].slice(0, _index);
                _importStatements[i][1][1] = _index - 1;
            }
            if (this.importDepth <= 32) this.imports.push(
                await this.handleImport(_importStatements[i])
            );
            else this.problems.push({
                msg: "import too deep",
                position: [_importStatements[i][1][0] - 1,_importStatements[i][1][1]],
                code: ErrorCode.DeepImport
            });
            document = fillIn(
                document, 
                [_importStatements[i][1][0] - 1,_importStatements[i][1][1]]
            );
        }

        if (!_importStatements.length) this.problems.push({
            msg: "cannot find op meta import",
            position: [0, 0],
            code: ErrorCode.UndefinedOpMeta
        });
        else {
            for (let i = 0; i < this.imports.length; i++) {
                if (this.imports[i].problems.length === 0) {
                    const _imp = this.imports[i];
                    const _cfg = deepCopy(_imp.config);
                    if (this.isDeepImport(_imp)) this.problems.push({
                        msg: "import too deep",
                        position: _imp.hashPosition,
                        code: ErrorCode.DeepImport
                    });
                    if (_imp.config?.problems?.length) this.problems.push(
                        ..._imp.config!.problems
                    );

                    const _ns: Namespace = { Items: [] };
                    if (_imp.name !== "root") _ns[_imp.name] = { Items: [] };
                    const _mns = _imp.name === "root" ? _ns : _ns[_imp.name] as Namespace;

                    if (_imp.sequence?.opmeta) {
                        if (_imp.sequence.opmeta.instance) {
                            _mns.Items.push({
                                index: i,
                                element: _imp.sequence.opmeta.instance
                            });
                        }
                        if (_imp.sequence.opmeta.problems.length) this.problems.push(
                            ..._imp.sequence.opmeta.problems
                        );
                    }
                    if (_imp.sequence?.ctxmeta) {
                        if (_imp.sequence.ctxmeta.instance) {
                            _mns.Items.push(..._imp.sequence.ctxmeta.instance.map(v => {
                                return {
                                    index: i,
                                    element: v
                                };
                            }));
                        }
                        if (_imp.sequence.ctxmeta.problems.length) this.problems.push(
                            ..._imp.sequence.ctxmeta.problems
                        );
                    }
                    if (_imp.sequence?.dotrain) {
                        if (_imp.sequence.dotrain.instance) {
                            _mns.Items.push(..._imp.sequence.dotrain.instance.namespace.Items);
                            const _entries = Object.entries(
                                _imp.sequence.dotrain.instance.namespace
                            ).filter(v => v[0] === "Items");
                            for (let j = 0; j < _entries.length; j++) {
                                _mns[_entries[j][0]] = _entries[j][1];
                            }
                        }
                        if (_imp.sequence.dotrain.problems.length) this.problems.push(
                            ..._imp.sequence.dotrain.problems
                        );
                    }
                    let _hasDupId = false;
                    const _names: string[] = [];
                    _names.push(..._mns.Items.flatMap(v => {
                        if (Array.isArray(v.element)) return v.element.flatMap(
                            e => [e.name, ...(e.aliases ?? [])]
                        );
                        else return v.element.name;
                    }));
                    _names.push(...Object.keys(_mns).filter(v => v !== "Items"));
                    for (let j = 0; j < _names.length; j++) {
                        if (!_hasDupId) for (let k = j + 1; k < _names.length; k++) {
                            if (!_hasDupId && _names[j] === _names[k]) _hasDupId = true;
                        }
                    }
                    if (_hasDupId) this.problems.push({
                        msg: "import contains items with duplicate identifiers",
                        position: _imp.hashPosition,
                        code: ErrorCode.DuplicateIdentifier
                    });
                    else {
                        if (_cfg?.statements) for (let j = 0; j < _cfg.statements.length; i++) {
                            const _s = _cfg.statements[i];
                            if (_s[1][0] === "!") {
                                if (_s[0][0] === ".") _mns.Items = _mns.Items.filter(v => {
                                    if ("hash" in v) return false; 
                                    else return false;
                                });
                                else {
                                    const _orgItemsLen = _mns.Items.length;
                                    _mns.Items = _mns.Items.filter(
                                        v => Array.isArray(v.element) || v.element.name !== _s[0][0]
                                    );
                                    if (_orgItemsLen !== _mns.Items.length && !_mns[_s[0][0]]) {
                                        this.problems.push({
                                            msg: `undefined identifier "${_s[0][0]}"`,
                                            position: _s[0][1],
                                            code: ErrorCode.UndefinedIdentifier
                                        });
                                    }
                                    else if (_mns[_s[0][0]]) delete _mns[_s[0][0]];
                                }
                            }
                            else {
                                if (_s[0][0].startsWith("'")) {
                                    const _renamingItems = _mns.Items.filter(v => 
                                        !Array.isArray(v.element) && 
                                        v.element.name === _s[0][0].slice(1)
                                    );
                                    if (!_renamingItems.length && !_mns[_s[0][0].slice(1)]) {
                                        this.problems.push({
                                            msg: `undefined identifier "${_s[0][0]}"`,
                                            position: _s[0][1],
                                            code: ErrorCode.UndefinedIdentifier
                                        });
                                    }
                                    else {
                                        _renamingItems.forEach(
                                            (v: any) => v.element.name === _s[1][0]
                                        );
                                        if (_mns[_s[0][0].slice(1)]) {
                                            _mns[_s[1][0]] = _mns[_s[0][0].slice(1)];
                                            delete _mns[_s[0][0].slice(1)];
                                        }
                                    }
                                }
                                else {
                                    const _rebindingItems = _mns.Items.filter(v => 
                                        !Array.isArray(v.element) && 
                                        !("column" in v.element) && 
                                        v.element.name === _s[0][0]
                                    ) as { index: number; element: Binding }[];
                                    const _falseRebindings = _mns.Items.filter(v => 
                                        !Array.isArray(v.element) && 
                                        !("content" in v.element) && 
                                        v.element.name === _s[0][0]
                                    );
                                    if (
                                        !_rebindingItems.length || 
                                        _mns[_s[0][0]] || 
                                        !_falseRebindings.length
                                    ) {
                                        if (_mns[_s[0][0]]) this.problems.push({
                                            msg: `cannot rebind namespace "${_s[0][0]}"`,
                                            position: _s[0][1],
                                            code: ErrorCode.UnexpectedRebinding
                                        });
                                        if (!_falseRebindings.length) this.problems.push({
                                            msg: `cannot rebind context alias "${_s[0][0]}"`,
                                            position: _s[0][1],
                                            code: ErrorCode.UnexpectedRebinding
                                        });
                                        if (!_rebindingItems.length) this.problems.push({
                                            msg: `undefined identifier "${_s[0][0]}"`,
                                            position: _s[0][1],
                                            code: ErrorCode.UndefinedIdentifier
                                        });
                                    }
                                    else _rebindingItems.forEach(v => {
                                        v.element.content = _s[1][0]; 
                                        v.element.contentPosition = _s[1][1];
                                    });
                                }
                            }
                        }
                        if (_imp.name !== "root" && !this.namespace[_imp.name]) {
                            this.namespace[_imp.name] = {
                                Items: []
                            };
                        }
                        const _cns = _imp.name === "root" 
                            ? this.namespace 
                            : this.namespace[_imp.name] as Namespace;
                        const _merge = (cns: Namespace, mns: Namespace) => {
                            let _dupErrorItems = false;
                            let _dupErrorNames = false;
                            const _itemsIndx: number[] = [];
                            const _namesIndx: number[] = [];
                            const _mids = Object.keys(mns).filter(v => v === "Items");
                            const _cids = Object.keys(cns).filter(v => v === "Items");
                            for (let j = 0; j < mns.Items.length; j++) {
                                let _hasDupId = false;
                                let _hasEqual = false;
                                const _me = mns.Items[j];
                                if (Array.isArray(_me.element)) {
                                    const _opIds = _me.element.flatMap(
                                        e => [e.name, ...(e.aliases ?? [])]
                                    );
                                    if (hasDuplicate(_opIds, _cids)) _hasDupId = true;
                                    else {
                                        for (let k = 0; k < cns.Items.length; k++) {
                                            const _ce = cns.Items[k];
                                            if (!_hasDupId && !_hasEqual) {
                                                if (Array.isArray(_ce.element)) {
                                                    if (
                                                        this.imports[_ce.index].hash===_imp.hash &&
                                                        isDeepStrictEqual(_me.element, _ce.element)
                                                    ) _hasEqual = true;
                                                    else if (
                                                        hasDuplicate(
                                                            _opIds,
                                                            _ce.element.flatMap(
                                                                e => [e.name, ...(e.aliases ?? [])]
                                                            )
                                                        )
                                                    ) _hasDupId = true;
                                                }
                                                else {
                                                    if (
                                                        _me.element.flatMap(
                                                            e => [e.name, ...(e.aliases ?? [])]
                                                        ).includes(_ce.element.name)
                                                    ) _hasDupId = true;
                                                }
                                            }
                                        }
                                    }
                                }
                                else {
                                    if (_cids.includes(_me.element.name)) _hasDupId = true;
                                    else {
                                        for (let k = 0; k < cns.Items.length; k++) {
                                            if (!_hasDupId && !_hasEqual) {
                                                const _ce = cns.Items[k];
                                                if (Array.isArray(_ce.element)) {
                                                    if (
                                                        _ce.element.flatMap(
                                                            e => [e.name, ...(e.aliases ?? [])]
                                                        ).includes(_me.element.name)
                                                    ) _hasDupId = true;
                                                }
                                                else {
                                                    if (_me.element.name === _ce.element.name) {
                                                        if (
                                                            this.imports[
                                                                _ce.index
                                                            ].hash === _imp.hash && 
                                                            isDeepStrictEqual(
                                                                _me.element, 
                                                                _ce.element
                                                            )
                                                        ) _hasEqual = true;
                                                        else _hasDupId = true;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                // for (let k = 0; k < cns.Items.length; k++) {
                                //     if (!_hasDupId && !_hasEqual) {
                                //         const _ce = cns.Items[k];
                                //         if (Array.isArray(_me.element)) {
                                //             if (Array.isArray(_ce.element)) {
                                //                 if (
                                //                     this.imports[_ce.index].hash === _imp.hash &&
                                //                     isDeepStrictEqual(_me.element, _ce.element)
                                //                 ) _hasEqual = true;
                                //                 else if (
                                //                     hasDuplicate(
                                //                         _me.element.flatMap(
                                //                             e => [e.name, ...(e.aliases ?? [])]
                                //                         ),
                                //                         _ce.element.flatMap(
                                //                             e => [e.name, ...(e.aliases ?? [])]
                                //                         )
                                //                     )
                                //                 ) _hasDupId = true;
                                //             }
                                //             else {
                                //                 if (
                                //                     _me.element.flatMap(
                                //                         e => [e.name, ...(e.aliases ?? [])]
                                //                     ).includes(_ce.element.name)
                                //                 ) _hasDupId = true;
                                //             }
                                //         }
                                //         else {
                                //             if (Array.isArray(_ce.element)) {
                                //                 if (
                                //                     _ce.element.flatMap(
                                //                         e => [e.name, ...(e.aliases ?? [])]
                                //                     ).includes(_me.element.name)
                                //                 ) _hasDupId = true;
                                //             }
                                //             else {
                                //                 if (_me.element.name === _ce.element.name) {
                                //                     if (
                                //                         this.imports[_ce.index].hash===_imp.hash && 
                                //                         isDeepStrictEqual(_me.element, _ce.element)
                                //                     ) _hasEqual = true;
                                //                     else _hasDupId = true;
                                //                 }
                                //             }
                                //         }
                                //     }
                                // }
                                if (_hasDupId || _hasEqual) {
                                    if (_hasDupId && !_dupErrorItems) {
                                        this.problems.push({
                                            msg: "duplicate identifier",
                                            position: _imp.hashPosition,
                                            code: ErrorCode.DuplicateIdentifier
                                        });
                                        _dupErrorItems = true;
                                    }
                                }
                                else _itemsIndx.push(j);
                            }
                            const _n = _cns.Items.flatMap(v => {
                                if (Array.isArray(v.element)) return v.element.flatMap(
                                    e => [e.name, ...(e.aliases ?? [])]
                                );
                                else return v.element.name;
                            });
                            for (let i = 0; i < _mids.length; i++) {
                                if (_n.includes(_mids[i])) {
                                    if (!_dupErrorItems && !_dupErrorNames) {
                                        this.problems.push({
                                            msg: "duplicate identifier",
                                            position: _imp.hashPosition,
                                            code: ErrorCode.DuplicateIdentifier
                                        });
                                        _dupErrorNames = true;
                                    }
                                }
                                else _namesIndx.push(i);
                            }
                            _itemsIndx.forEach(v => cns.Items.push(mns.Items[v]));
                            _namesIndx.forEach(v => {
                                if (!cns[_mids[v]]) cns[_mids[v]] = mns[_mids[v]];
                                else _merge(cns[_mids[v]] as Namespace, mns[_mids[v]] as Namespace);
                            });
                            // _mids.forEach(v => {
                            //     if (!cns[v]) cns[v] = mns[v];
                            //     else _merge(cns[v] as Namespace, mns[v] as Namespace);
                            // });
                        };
                        _merge(_cns, _mns);
                    }
                }
            }
        }